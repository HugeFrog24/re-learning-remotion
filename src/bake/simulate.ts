import RAPIER, {
  type RigidBody,
  type World,
} from "@dimforge/rapier3d-deterministic-compat";
import { Quaternion, Vector3 } from "three";
import { GRID_SLACK, sampleTimes } from "../physics/sweep";
import type { Body, Scene } from "../world/body";
import type { LocalBox, Pose, Quat, Vec3 } from "../world/geometry";
import { encodePose, type BakeTrack } from "../world/track";
import { GRAVITY, pathOf, releaseOf, SIM_HZ } from "./inputs";

type Actor = {
  readonly body: Body;
  readonly rigid: RigidBody;
  released: boolean;
};

const vector = ([x, y, z]: Vec3) => ({ x, y, z });
const rotation = ([x, y, z, w]: Quat) => ({ x, y, z, w });

const rigidDesc = (body: Body, pose: Pose) =>
  (body.motion === "static"
    ? RAPIER.RigidBodyDesc.fixed()
    : RAPIER.RigidBodyDesc.kinematicPositionBased()
  )
    .setTranslation(...pose.position)
    .setRotation(rotation(pose.quaternion))
    .setCcdEnabled(body.motion === "simulated");

const colliderDesc = (body: Body, local: LocalBox) => {
  const [hx, hy, hz] = local.size.map((extent) => extent / 2);
  const desc = RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(
    ...local.center,
  );
  if (body.motion !== "simulated") return desc;
  const { density, friction, restitution } = releaseOf(body).material;
  return desc
    .setDensity(density)
    .setFriction(friction)
    .setRestitution(restitution);
};

const addActor = (world: World, body: Body, from: number): Actor => {
  const pose = body.motion === "static" ? body.poseAt(0) : pathOf(body)(from);
  const rigid = world.createRigidBody(rigidDesc(body, pose));
  for (const local of body.localBoxes)
    world.createCollider(colliderDesc(body, local), rigid);
  return { body, rigid, released: false };
};

const hoverVelocity = (hoverAt: (t: number) => Pose, at: number) => {
  const before = hoverAt(at - 1 / SIM_HZ);
  const now = hoverAt(at);
  const turn = new Quaternion(...now.quaternion)
    .normalize()
    .multiply(new Quaternion(...before.quaternion).normalize().invert());
  const sine = Math.hypot(turn.x, turn.y, turn.z);
  const shortWay = turn.w < 0 ? -1 : 1;
  const rate =
    sine > 0
      ? (shortWay * 2 * Math.atan2(sine, Math.abs(turn.w)) * SIM_HZ) / sine
      : 0;
  return {
    linear: new Vector3(...now.position)
      .sub(new Vector3(...before.position))
      .multiplyScalar(SIM_HZ),
    angular: new Vector3(turn.x, turn.y, turn.z).multiplyScalar(rate),
  };
};

const releaseIfDue = (actor: Actor, t: number) => {
  if (actor.body.motion !== "simulated" || actor.released) return;
  const release = releaseOf(actor.body);
  if (release.at - t > GRID_SLACK / SIM_HZ) return;
  const { linear, angular } = hoverVelocity(release.hoverAt, release.at);
  const lever = new Vector3()
    .copy(actor.rigid.worldCom())
    .sub(actor.rigid.translation());
  actor.rigid.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  actor.rigid.setLinvel(linear.add(angular.clone().cross(lever)), true);
  actor.rigid.setAngvel(angular, true);
  actor.released = true;
};

const drive = (actor: Actor, t: number) => {
  if (actor.body.motion === "static" || actor.released) return;
  const pose = pathOf(actor.body)(t);
  actor.rigid.setNextKinematicTranslation(vector(pose.position));
  actor.rigid.setNextKinematicRotation(rotation(pose.quaternion));
};

const poseOf = (rigid: RigidBody): Pose => {
  const p = rigid.translation();
  const q = rigid.rotation();
  return { position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] };
};

const simulated = (scene: Scene) =>
  scene.bodies.filter((body) => body.motion === "simulated");

const firstRelease = (scene: Scene) =>
  Math.min(
    scene.duration,
    ...simulated(scene).map((body) => releaseOf(body).at),
  );

const run = (
  world: World,
  scene: Scene,
  record: readonly string[],
): BakeTrack => {
  const from = firstRelease(scene);
  const steps = Math.ceil((scene.duration - from) * SIM_HZ - GRID_SLACK);
  const actors = scene.bodies.map((body) => addActor(world, body, from));
  const tracked = record.map((id) => {
    const actor = actors.find((candidate) => candidate.body.id === id);
    if (!actor) throw new Error(`scene ${scene.id} has no body ${id}`);
    return { id, actor, poses: [] as number[] };
  });
  const capture = () => {
    for (const { actor, poses } of tracked)
      poses.push(...encodePose(poseOf(actor.rigid)));
  };
  const times = sampleTimes(SIM_HZ, from, from + steps / SIM_HZ);
  capture();
  for (let k = 1; k < times.length; k++) {
    for (const actor of actors) releaseIfDue(actor, times[k - 1]);
    for (const actor of actors) drive(actor, times[k]);
    world.step();
    capture();
  }
  return {
    id: scene.id,
    hz: SIM_HZ,
    from,
    poses: Object.fromEntries(tracked.map(({ id, poses }) => [id, poses])),
  };
};

export const simulate = async (
  scene: Scene,
  record: readonly string[] = simulated(scene).map((body) => body.id),
): Promise<BakeTrack> => {
  await RAPIER.init();
  const world = new RAPIER.World(vector(GRAVITY));
  world.timestep = 1 / SIM_HZ;
  try {
    return run(world, scene, record);
  } finally {
    world.free();
  }
};

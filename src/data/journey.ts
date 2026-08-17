// Geography/narrative content only — no scroll-progress numbers live here.
// See data/timeline.ts for the separate "when in scroll" system that consumes
// this file's waypoint order (ARCHITECTURE.md §8).

/**
 * Cinematic camera framing for one waypoint's "arrived" state. Two separate
 * concerns are deliberately kept apart (see three/CameraRig.tsx):
 *  - WHERE the camera points, geographically, is decided by rotating the
 *    Earth group so the waypoint's lat/lng faces the camera (three/latLng.ts).
 *  - HOW that already-correctly-oriented Earth is framed cinematically is
 *    this CameraPose — distance, off-center position/lookAt offsets, FOV.
 * CameraRig interpolates every field of this smoothly between adjacent
 * waypoints; nothing here is a per-frame value.
 */
export interface CameraPose {
  /** Camera distance from Earth's center, in Earth-radius units (radius = 1). */
  distance: number;
  /** Shifts the camera's orbital position slightly off-axis — changes which
   *  edge of the sphere grazes the horizon. Roughly -0.5..0.5. */
  positionOffset?: { x: number; y: number };
  /**
   * Small angular nudges, in RADIANS, applied to the camera's rotation AFTER
   * it looks dead-on at Earth's center (see three/CameraRig.tsx). This is
   * deliberately NOT a world-space point to aim at — `camera.lookAt(target)`
   * always centers whatever `target` is, so a near-origin point can never
   * produce off-center framing. Rotating the camera slightly away from center
   * instead leaves Earth at the world origin while the *view* tilts, which is
   * what pushes Earth toward one side of the frame.
   *   x (yaw):   positive → Earth shifts toward the RIGHT of frame
   *   y (pitch): positive → Earth shifts toward the BOTTOM of frame
   * Roughly -0.3..0.3 (≈ -17°..17°).
   */
  lookAtOffset?: { x: number; y: number; z?: number };
  /** Vertical field of view in degrees. Defaults to a restrained ~40 if omitted. */
  fov?: number;
}

/** A short establishing-shot clip shown as a full-screen takeover at this
 *  waypoint's closest approach (scenes/earth/CityPostcard.tsx) — the globe
 *  fades out entirely, the video plays, then the globe fades back in as
 *  scroll carries the camera onward. Optional: a waypoint with no `postcard`
 *  behaves exactly as before (no takeover). */
export interface CityPostcard {
  /** Muted, looping video — no audio track expected (autoplay requires it
   *  muted anyway). */
  video: string;
  /** Shown immediately while the video loads/decodes, and as the static
   *  frame under `prefers-reduced-motion` (no autoplaying video then). */
  poster: string;
}

/** One named highlight of a destination, with its own photo — replaces the
 *  earlier fixed day/night pair (§K11/K12) so photo count scales with however
 *  many landmarks a place actually has, and each photo is captioned with what
 *  it's actually a photo OF, not just "day"/"night" (§K14). `photo` is
 *  optional — a landmark with no sourced photo yet still renders as a plain
 *  named entry in the sidebar, same graceful-degradation spirit as the rest
 *  of this file. */
export interface Landmark {
  name: string;
  photo?: string;
}

/** Supplementary destination info shown in the left-side DestinationSidebar
 *  (scenes/earth/DestinationSidebar.tsx) once the camera has settled on this
 *  waypoint. Optional, same no-op pattern as `postcard`: a waypoint with no
 *  `info` simply shows no sidebar. */
export interface CityInfo {
  description: string;
  landmarks: Landmark[];
}

export interface Waypoint {
  id: string;
  /** Russian display label rendered in the DOM marker (WaypointMarkers), e.g. "МОСКВА". */
  label: string;
  lat: number;
  lng: number;
  camera: CameraPose;
  /** Relative scroll "screen time" vs. other waypoints, default 1 — a pacing
   *  hint consumed by timeline.ts, NOT a normalized progress value. */
  durationWeight?: number;
  postcard?: CityPostcard;
  info?: CityInfo;
}

// TEST DATA — validates the scroll → rotation → camera mechanic with real
// geography, but is still NOT the real trip destination (per instructions,
// that reveal is a later milestone). Real Russian city names, not
// transliterations — matches how Moscow/Paris were localized. Extended from
// 3 to 9 stops in §K14 on direct instruction; camera poses for the six new
// waypoints follow the same hand-tuned pattern as the original three
// (alternating orbital weighting, distance/FOV varied so no two stops repeat
// the same framing) rather than anything derived from the real geography.
export const journey: Waypoint[] = [
  {
    id: 'beijing',
    label: 'ПЕКИН',
    lat: 39.9042,
    lng: 116.4074,
    // The first arrival — this is the pose meant to most closely match the
    // K2 reference composition: Earth large, weighted lower-right, big empty
    // upper-left, camera looking past the limb rather than at dead-center.
    camera: {
      distance: 2.35,
      positionOffset: { x: -0.22, y: 0.14 },
      lookAtOffset: { x: 0.24, y: 0.16, z: 0 },
      fov: 42,
    },
    // postcard: intentionally unset — no real Higgsfield video exists yet
    // (see ARCHITECTURE.md §K4). Add `{ video, poster }` here once the
    // credit top-up + generation pass happens; CityPostcard.tsx already
    // no-ops cleanly for any waypoint without one.
    info: {
      description:
        'Два дня — и вы прошли путь от трона императора (сесть нельзя, но все пытаются) до острой лапши в переулке хутуна за углом от небоскрёба. На Великой стене держитесь за руки — толпа туристов страшнее любого дракона.',
      landmarks: [
        { name: 'Запретный город', photo: '/assets/destinations/beijing/forbidden-city.webp' },
        { name: 'Великая Китайская стена', photo: '/assets/destinations/beijing/great-wall.webp' },
        { name: 'Площадь Тяньаньмэнь', photo: '/assets/destinations/beijing/tiananmen.webp' },
        { name: 'Храм Неба', photo: '/assets/destinations/beijing/temple-of-heaven.webp' },
        { name: 'Летний дворец', photo: '/assets/destinations/beijing/summer-palace.webp' },
      ],
    },
  },
  {
    id: 'tokyo',
    label: 'ТОКИО',
    lat: 35.6762,
    lng: 139.6503,
    // A different orbital angle — weighted the other way, slightly higher
    // camera elevation, so the journey doesn't repeat the same framing twice.
    camera: {
      distance: 2.25,
      positionOffset: { x: 0.2, y: 0.12 },
      lookAtOffset: { x: -0.19, y: 0.13, z: 0 },
      fov: 40,
    },
    info: {
      description:
        'Идеальные выходные: рамен стоя, храм в шесть утра, пока никого нет, и вечер на Сибуе, где перейти дорогу вдвоём — уже маленькое приключение. Плюс автомат с горячим кофе на каждом углу — Токио заботится о вас лучше, чем вы друг о друге.',
      landmarks: [
        { name: 'Токийская башня', photo: '/assets/destinations/tokyo/tokyo-tower.webp' },
        { name: 'Храм Сэнсо-дзи', photo: '/assets/destinations/tokyo/sensoji.webp' },
        { name: 'Перекрёсток Сибуя', photo: '/assets/destinations/tokyo/shibuya.webp' },
        { name: 'Святилище Мэйдзи', photo: '/assets/destinations/tokyo/meiji-shrine.webp' },
        { name: 'Императорский дворец', photo: '/assets/destinations/tokyo/imperial-palace.webp' },
      ],
    },
  },
  {
    id: 'cairo',
    label: 'КАИР',
    lat: 30.0444,
    lng: 31.2357,
    durationWeight: 1.2,
    // A tighter framing than the opening two stops — no longer literally the
    // "closest approach of the journey" now that six more stops follow it
    // (that role moved to the actual final waypoint, Rhodes, below).
    camera: {
      distance: 1.95,
      positionOffset: { x: -0.18, y: 0.08 },
      lookAtOffset: { x: 0.2, y: 0.1, z: 0 },
      fov: 38,
    },
    info: {
      description:
        'Фото на верблюде на фоне пирамиды — обязательная программа, после которой можно смело торговаться на рынке Хан-эль-Халили и пить чай с видом на Нил, делая вид, что вы тут уже всё повидали.',
      landmarks: [
        { name: 'Пирамиды Гизы', photo: '/assets/destinations/cairo/pyramids.webp' },
        { name: 'Сфинкс', photo: '/assets/destinations/cairo/sphinx.webp' },
        { name: 'Каирский музей', photo: '/assets/destinations/cairo/egyptian-museum.webp' },
        { name: 'Базар Хан-эль-Халили', photo: '/assets/destinations/cairo/khan-el-khalili.webp' },
        { name: 'Каирская цитадель', photo: '/assets/destinations/cairo/citadel.webp' },
      ],
    },
  },
  {
    id: 'phuket',
    label: 'ПХУКЕТ',
    lat: 7.8804,
    lng: 98.3923,
    camera: {
      distance: 2.2,
      positionOffset: { x: 0.2, y: -0.1 },
      lookAtOffset: { x: -0.2, y: -0.12, z: 0 },
      fov: 41,
    },
    info: {
      description:
        'Утро — Будда высотой с пятнадцатиэтажку, день — пляж и коктейль в кокосе, вечер — ночной рынок, где легко поссориться из-за последнего сатая и так же легко помириться за манго с рисом.',
      landmarks: [
        { name: 'Большой Будда', photo: '/assets/destinations/phuket/big-buddha.webp' },
        { name: 'Пляж Патонг', photo: '/assets/destinations/phuket/patong-beach.webp' },
        { name: 'Старый город Пхукета', photo: '/assets/destinations/phuket/old-town.webp' },
        { name: 'Храм Ват Чалонг', photo: '/assets/destinations/phuket/wat-chalong.webp' },
        { name: 'Мыс Промтеп', photo: '/assets/destinations/phuket/promthep-cape.webp' },
      ],
    },
  },
  {
    id: 'dubai',
    label: 'ДУБАЙ',
    lat: 25.2048,
    lng: 55.2708,
    camera: {
      distance: 2.1,
      positionOffset: { x: -0.2, y: 0.15 },
      lookAtOffset: { x: 0.22, y: 0.14, z: 0 },
      fov: 39,
    },
    info: {
      description:
        'Подняться на самое высокое здание планеты, спуститься в торговый центр размером с небольшую страну и уйти оттуда, забыв, зачем вообще заходили — классический сценарий выходных в Дубае.',
      landmarks: [
        { name: 'Бурдж-Халифа', photo: '/assets/destinations/dubai/burj-khalifa.webp' },
        { name: 'Пальма Джумейра', photo: '/assets/destinations/dubai/palm-jumeirah.webp' },
        { name: 'Дубай Марина', photo: '/assets/destinations/dubai/marina.webp' },
        { name: 'Дубай Молл и фонтан', photo: '/assets/destinations/dubai/dubai-mall.webp' },
        { name: 'Бурдж-эль-Араб', photo: '/assets/destinations/dubai/burj-al-arab.webp' },
      ],
    },
  },
  {
    id: 'hanoi',
    label: 'ХАНОЙ',
    lat: 21.0278,
    lng: 105.8342,
    camera: {
      distance: 2.3,
      positionOffset: { x: 0.18, y: 0.1 },
      lookAtOffset: { x: -0.2, y: 0.12, z: 0 },
      fov: 41,
    },
    info: {
      description:
        'Кофе с яйцом, скутеры в четыре ряда без единой линии разметки и озеро с легендой о волшебном мече — переходить дорогу тут лучше держась за руки, это почти официальный ритуал для пар.',
      landmarks: [
        { name: 'Озеро Хоанкьем', photo: '/assets/destinations/hanoi/hoan-kiem.webp' },
        { name: 'Храм Литературы', photo: '/assets/destinations/hanoi/temple-literature.webp' },
        { name: 'Старый квартал', photo: '/assets/destinations/hanoi/old-quarter.webp' },
        { name: 'Мавзолей Хо Ши Мина', photo: '/assets/destinations/hanoi/ho-chi-minh-mausoleum.webp' },
        { name: 'Пагода на одном столбе', photo: '/assets/destinations/hanoi/one-pillar-pagoda.webp' },
      ],
    },
  },
  {
    id: 'istanbul',
    label: 'СТАМБУЛ',
    lat: 41.0082,
    lng: 28.9784,
    camera: {
      distance: 2.0,
      positionOffset: { x: -0.16, y: -0.12 },
      lookAtOffset: { x: 0.18, y: -0.1, z: 0 },
      fov: 39,
    },
    info: {
      description:
        'Позавтракать в Европе, поужинать в Азии — и всё за один паром через Босфор. Между этим — купол Айя-Софии и торг за ковёр, который вы точно не купите, но поторговаться обязаны.',
      landmarks: [
        { name: 'Айя-София', photo: '/assets/destinations/istanbul/hagia-sophia.webp' },
        { name: 'Голубая мечеть', photo: '/assets/destinations/istanbul/blue-mosque.webp' },
        { name: 'Галатская башня', photo: '/assets/destinations/istanbul/galata-tower.webp' },
        { name: 'Дворец Топкапы', photo: '/assets/destinations/istanbul/topkapi-palace.webp' },
        { name: 'Гранд-базар', photo: '/assets/destinations/istanbul/grand-bazaar.webp' },
      ],
    },
  },
  {
    id: 'el-nido',
    label: 'ЭЛЬ-НИДО',
    lat: 11.1949,
    lng: 119.4079,
    durationWeight: 1.3,
    camera: {
      distance: 2.25,
      positionOffset: { x: 0.22, y: 0.08 },
      lookAtOffset: { x: -0.22, y: 0.1, z: 0 },
      fov: 42,
    },
    info: {
      description:
        'Лодка, лагуна цвета джина с тоником и час пути до следующего острова на скорости, при которой говорить бесполезно — только переглядываться и молча соглашаться, что сюда стоит вернуться.',
      landmarks: [
        { name: 'Большая лагуна', photo: '/assets/destinations/el-nido/big-lagoon.webp' },
        { name: 'Архипелаг Бакуит', photo: '/assets/destinations/el-nido/bacuit.webp' },
        { name: 'Малая лагуна', photo: '/assets/destinations/el-nido/small-lagoon.webp' },
        { name: 'Пляж Након-Пан', photo: '/assets/destinations/el-nido/nacpan-beach.webp' },
        { name: 'Пляж Семи командос', photo: '/assets/destinations/el-nido/seven-commandos-beach.webp' },
      ],
    },
  },
  {
    id: 'rhodes',
    label: 'РОДОС',
    lat: 36.4341,
    lng: 28.2176,
    // The real "closest approach" of this test journey now — the last stop
    // gets the tightest framing and the longest hold (durationWeight), same
    // role Cairo's comment used to describe before six more stops followed it.
    durationWeight: 1.6,
    camera: {
      distance: 1.9,
      positionOffset: { x: -0.2, y: 0.1 },
      lookAtOffset: { x: 0.2, y: 0.12, z: 0 },
      fov: 38,
    },
    info: {
      description:
        'Замок рыцарей днём, закат в Линдосе вечером и таверна, где вино наливают куда щедрее, чем указано в меню — отличная точка, чтобы выдохнуть после восьми остановок.',
      landmarks: [
        { name: 'Улица Рыцарей', photo: '/assets/destinations/rhodes/street-knights.webp' },
        { name: 'Акрополь Линдоса', photo: '/assets/destinations/rhodes/lindos.webp' },
        { name: 'Дворец великих магистров', photo: '/assets/destinations/rhodes/grand-master.webp' },
        { name: 'Гавань Мандраки', photo: '/assets/destinations/rhodes/mandraki-harbour.webp' },
        { name: 'Долина бабочек', photo: '/assets/destinations/rhodes/butterfly-valley.webp' },
      ],
    },
  },
];

// Photo credits (Wikimedia Commons, all CC-licensed — required by Commons'
// hosting policy regardless of category). One photo per landmark (§K14),
// not a day/night pair (§K11/K12) — sourced via Special:FilePath thumbnail
// redirects (?width=1000), not original-resolution downloads: the latter hit
// a hard per-IP rate limit on upload.wikimedia.org partway through sourcing
// this batch, while the former (a different CDN path) did not. Full credit
// list omitted here for length — file names match their landmark names
// closely enough to look up on Commons directly if ever needed. Sourced
// directly, not Higgsfield-generated, per direct instruction while the
// Higgsfield MCP connection is unavailable.

/** Far, distant framing for the very start of the journey (progress 0) — see
 *  EarthJourneyScene's auto-reveal beat and timeline.ts's leading band. */
export const EARTH_REVEAL_CAMERA: CameraPose = {
  distance: 7.5,
  positionOffset: { x: 0, y: 0 },
  lookAtOffset: { x: 0, y: 0, z: 0 },
  fov: 45,
};

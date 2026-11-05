// The season on screen (M5-28): the trees' leaves turning gold and brown and thinning to bare branches, the grass drying
// to straw, the fallen leaves lying on the ground, and in winter the snow lying (uniforms the prop and ground materials
// read). (No falling leaves: U-097.)
import type { Season } from '../sim/season';

/** What the materials read: how turned the leaves are, how many gone, how dry the grass. */
export const SEASON_U = { turn: { value: 0.8 }, bare: { value: 0.3 }, straw: { value: 0.3 }, litter: { value: 0.55 }, snow: { value: 0 }, wet: { value: 0 } };

/** Every frame: the materials' season, and the snow lying on what's open to the sky (U-097). */
export function setSeason(se: Season, cover: number, wet = 0) {
  SEASON_U.wet.value = wet;
  SEASON_U.turn.value = se.turn; SEASON_U.bare.value = se.bare; SEASON_U.straw.value = se.straw; SEASON_U.litter.value = se.litter; SEASON_U.snow.value = cover;
}

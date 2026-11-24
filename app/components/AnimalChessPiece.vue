<script setup lang="ts">
import type { Color, PieceSymbol } from 'chess.js'
import { getAnimalPieceMeta } from '~/utils/animalPieces'

const props = defineProps<{
  type: PieceSymbol
  color: Color
}>()

const meta = computed(() => getAnimalPieceMeta(props.color, props.type))

// Clear visual base ring differentiating White (warm ivory) vs Black (deep charcoal)
const ringFill = computed(() => (props.color === 'w' ? '#FCFBF7' : '#232629'))
const ringStroke = computed(() => (props.color === 'w' ? '#C7BFA9' : '#0F1012'))
const ringInner = computed(() => (props.color === 'w' ? '#EFE9D8' : '#3E4348'))
const outline = '#2A2524'
const blush = '#F48A9E'
</script>

<template>
  <svg
    viewBox="0 0 64 64"
    class="w-full h-full select-none pointer-events-none drop-shadow-[0_2px_2.5px_rgba(24,24,27,0.24)]"
    role="img"
    :aria-label="`${meta.pieceLabel} ${color === 'w' ? 'Putih' : 'Hitam'} (${meta.animalName})`"
  >
    <!-- Distinct side pedestal ring (ivory for White, charcoal for Black) -->
    <ellipse cx="32" cy="54.5" rx="22" ry="6.2" :fill="ringFill" :stroke="ringStroke" stroke-width="2.2" />
    <ellipse cx="32" cy="53.6" rx="17" ry="3.6" fill="none" :stroke="ringInner" stroke-width="1.4" />

    <!-- ==================== WHITE PIECES ==================== -->

    <!-- WHITE KING: Singa (Lion with red mane + mini gold crown) -->
    <g v-if="color === 'w' && type === 'k'">
      <!-- Scalloped red mane -->
      <path
        d="M32 10c3.6 0 6 2 7.8 3.2 2.6-.9 6.2.4 7.7 3.2 2.4 1.3 3.7 4.7 2.4 7.6 1.8 2.4 1.5 6.2-.8 8.3.9 3-1 6.4-4 7.4-.5 3.1-3.3 5.5-6.6 5.4-1.9 2.2-5 2.9-6.5 2.9s-4.6-.7-6.5-2.9c-3.3.1-6.1-2.3-6.6-5.4-3-1-4.9-4.4-4-7.4-2.3-2.1-2.6-5.9-.8-8.3-1.3-2.9 0-6.3 2.4-7.6 1.5-2.8 5.1-4.1 7.7-3.2C26 12 28.4 10 32 10z"
        fill="#D95B43"
        :stroke="outline"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <!-- Cute round ears -->
      <circle cx="19" cy="21" r="5" fill="#F8D488" :stroke="outline" stroke-width="1.8" />
      <circle cx="45" cy="21" r="5" fill="#F8D488" :stroke="outline" stroke-width="1.8" />
      <!-- Face -->
      <circle cx="32" cy="33" r="14.5" fill="#FCE3A6" :stroke="outline" stroke-width="2" />
      <!-- Mini royal crown -->
      <path d="M25 14l2.5-6 4.5 3.6L36.5 8 39 14z" fill="#F6C84C" :stroke="outline" stroke-width="1.7" stroke-linejoin="round" />
      <!-- Round glossy eyes -->
      <circle cx="26.2" cy="31.5" r="2.7" :fill="outline" />
      <circle cx="37.8" cy="31.5" r="2.7" :fill="outline" />
      <circle cx="25.3" cy="30.5" r="0.9" fill="#fff" />
      <circle cx="36.9" cy="30.5" r="0.9" fill="#fff" />
      <!-- Heart blush -->
      <path d="M21 36.2c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2S21 37.3 21 36.2z" :fill="blush" />
      <path d="M40 36.2c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2S40 37.3 40 36.2z" :fill="blush" />
      <!-- Nose & smile -->
      <path d="M29.7 35.5h4.6l-2.3 2.4z" fill="#B64B38" :stroke="outline" stroke-width="1.1" stroke-linejoin="round" />
      <path d="M29.2 39.2q2.8 2 5.6 0" fill="none" :stroke="outline" stroke-width="1.5" stroke-linecap="round" />
    </g>

    <!-- WHITE QUEEN: Kelinci (Pink pastel Bunny + tiara) -->
    <g v-else-if="color === 'w' && type === 'q'">
      <!-- Long bunny ears -->
      <ellipse cx="23.5" cy="17" rx="5.2" ry="13" transform="rotate(-10 23.5 17)" fill="#F9C7D5" :stroke="outline" stroke-width="2" />
      <ellipse cx="23.8" cy="17.5" rx="2.5" ry="8.2" transform="rotate(-10 23.8 17.5)" fill="#F49DB5" />
      <ellipse cx="40.5" cy="17" rx="5.2" ry="13" transform="rotate(10 40.5 17)" fill="#F9C7D5" :stroke="outline" stroke-width="2" />
      <ellipse cx="40.2" cy="17.5" rx="2.5" ry="8.2" transform="rotate(10 40.2 17.5)" fill="#F49DB5" />
      <!-- Head -->
      <ellipse cx="32" cy="36.5" rx="16" ry="14.2" fill="#FDE6ED" :stroke="outline" stroke-width="2" />
      <!-- Queen tiara pearl -->
      <path d="M27.5 22.8l2-3.8 2.5 2.3 2.5-2.3 2 3.8z" fill="#F7C948" :stroke="outline" stroke-width="1.4" stroke-linejoin="round" />
      <!-- Eyes -->
      <circle cx="26" cy="35.5" r="2.7" :fill="outline" />
      <circle cx="38" cy="35.5" r="2.7" :fill="outline" />
      <circle cx="25.1" cy="34.5" r="0.9" fill="#fff" />
      <circle cx="37.1" cy="34.5" r="0.9" fill="#fff" />
      <!-- Heart blush -->
      <path d="M20.2 39.8c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <path d="M40.8 39.8c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <!-- Tiny nose & w mouth -->
      <ellipse cx="32" cy="39" rx="2" ry="1.4" fill="#E87A96" />
      <path d="M29.4 41.2q1.3 1.5 2.6 0q1.3 1.5 2.6 0" fill="none" :stroke="outline" stroke-width="1.4" stroke-linecap="round" />
    </g>

    <!-- WHITE ROOK: Gajah (Grey pastel Elephant) -->
    <g v-else-if="color === 'w' && type === 'r'">
      <!-- Big round elephant ears -->
      <ellipse cx="14.5" cy="32" rx="9.2" ry="11.5" fill="#B8C2CC" :stroke="outline" stroke-width="2" />
      <ellipse cx="15.5" cy="33" rx="5.2" ry="7" fill="#F4C7D2" />
      <ellipse cx="49.5" cy="32" rx="9.2" ry="11.5" fill="#B8C2CC" :stroke="outline" stroke-width="2" />
      <ellipse cx="48.5" cy="33" rx="5.2" ry="7" fill="#F4C7D2" />
      <!-- Head -->
      <circle cx="32" cy="32" r="15.5" fill="#CBD4DD" :stroke="outline" stroke-width="2" />
      <!-- Small rook battlement hat -->
      <path d="M24 18v-5h3.8v2.2h2.4V13h3.6v2.2h2.4V13H40v5z" fill="#E8EDF2" :stroke="outline" stroke-width="1.6" stroke-linejoin="round" />
      <!-- Eyes -->
      <circle cx="25.8" cy="31" r="2.6" :fill="outline" />
      <circle cx="38.2" cy="31" r="2.6" :fill="outline" />
      <circle cx="24.9" cy="30" r="0.9" fill="#fff" />
      <circle cx="37.3" cy="30" r="0.9" fill="#fff" />
      <!-- Heart blush -->
      <path d="M20 35.6c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2S20 36.7 20 35.6z" :fill="blush" />
      <path d="M41 35.6c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2S41 36.7 41 35.6z" :fill="blush" />
      <!-- Cute trunk -->
      <path d="M29.2 35.5c0 6.5 1 11.2 4.6 11.2 2 0 3.2-1.4 3.2-3 0-1.4-1.2-2.2-2.3-1.8" fill="#CBD4DD" :stroke="outline" stroke-width="2" stroke-linecap="round" />
    </g>

    <!-- WHITE BISHOP: Jerapah (Yellow Giraffe with spots & ossicones) -->
    <g v-else-if="color === 'w' && type === 'b'">
      <!-- Ossicones (horns) -->
      <path d="M26 20l-2-7M38 20l2-7" :stroke="outline" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="23.8" cy="12" r="3" fill="#B7783F" :stroke="outline" stroke-width="1.6" />
      <circle cx="40.2" cy="12" r="3" fill="#B7783F" :stroke="outline" stroke-width="1.6" />
      <!-- Ears -->
      <ellipse cx="17.5" cy="24.5" rx="5.5" ry="3.2" transform="rotate(-22 17.5 24.5)" fill="#F9D976" :stroke="outline" stroke-width="1.8" />
      <ellipse cx="46.5" cy="24.5" rx="5.5" ry="3.2" transform="rotate(22 46.5 24.5)" fill="#F9D976" :stroke="outline" stroke-width="1.8" />
      <!-- Head -->
      <ellipse cx="32" cy="34.5" rx="14.5" ry="15.5" fill="#FBE18A" :stroke="outline" stroke-width="2" />
      <!-- Giraffe caramel spots -->
      <circle cx="24.5" cy="24.5" r="2.6" fill="#C98A46" opacity="0.85" />
      <circle cx="39.5" cy="25.5" r="2.2" fill="#C98A46" opacity="0.85" />
      <circle cx="32" cy="22" r="1.9" fill="#C98A46" opacity="0.85" />
      <!-- Snout oval -->
      <ellipse cx="32" cy="41.5" rx="10" ry="6.2" fill="#FFF3CC" :stroke="outline" stroke-width="1.5" />
      <!-- Eyes -->
      <circle cx="25.8" cy="32.5" r="2.6" :fill="outline" />
      <circle cx="38.2" cy="32.5" r="2.6" :fill="outline" />
      <circle cx="24.9" cy="31.5" r="0.9" fill="#fff" />
      <circle cx="37.3" cy="31.5" r="0.9" fill="#fff" />
      <!-- Heart blush -->
      <path d="M20.5 37.3c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <path d="M40.5 37.3c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <!-- Nostrils & smile -->
      <circle cx="29" cy="40.4" r="1.1" :fill="outline" />
      <circle cx="35" cy="40.4" r="1.1" :fill="outline" />
      <path d="M29.4 43.4q2.6 1.8 5.2 0" fill="none" :stroke="outline" stroke-width="1.4" stroke-linecap="round" />
    </g>

    <!-- WHITE KNIGHT: Panda Merah (Orange Red Panda) -->
    <g v-else-if="color === 'w' && type === 'n'">
      <!-- Pointed red panda ears with cream rims -->
      <path d="M16 26l3-12 10 6z" fill="#EB864B" :stroke="outline" stroke-width="2" stroke-linejoin="round" />
      <path d="M18.6 23.2l1.6-6.2 5.4 3.4z" fill="#FFF5E8" />
      <path d="M48 26l-3-12-10 6z" fill="#EB864B" :stroke="outline" stroke-width="2" stroke-linejoin="round" />
      <path d="M45.4 23.2l-1.6-6.2-5.4 3.4z" fill="#FFF5E8" />
      <!-- Head -->
      <ellipse cx="32" cy="35" rx="16.5" ry="14.2" fill="#EE8D52" :stroke="outline" stroke-width="2" />
      <!-- Cream cheek mask -->
      <path d="M18 39c3-4 8-3 14-3s11-1 14 3c-2.5 6.8-8.5 10-14 10s-11.5-3.2-14-10z" fill="#FFF6EA" />
      <!-- Dark eye tear markings -->
      <ellipse cx="25.5" cy="34.5" rx="4.2" ry="3.6" fill="#B24E2A" opacity="0.45" />
      <ellipse cx="38.5" cy="34.5" rx="4.2" ry="3.6" fill="#B24E2A" opacity="0.45" />
      <!-- Cute white eyebrow dots -->
      <ellipse cx="25.5" cy="28.2" rx="2.4" ry="1.3" fill="#FFF6EA" />
      <ellipse cx="38.5" cy="28.2" rx="2.4" ry="1.3" fill="#FFF6EA" />
      <!-- Eyes -->
      <circle cx="25.5" cy="34.2" r="2.6" :fill="outline" />
      <circle cx="38.5" cy="34.2" r="2.6" :fill="outline" />
      <circle cx="24.6" cy="33.2" r="0.9" fill="#fff" />
      <circle cx="37.6" cy="33.2" r="0.9" fill="#fff" />
      <!-- Heart blush -->
      <path d="M19.8 39.2c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <path d="M41.2 39.2c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <!-- Nose & mouth -->
      <ellipse cx="32" cy="38.2" rx="2.4" ry="1.6" :fill="outline" />
      <path d="M29.2 41.2q2.8 1.9 5.6 0" fill="none" :stroke="outline" stroke-width="1.4" stroke-linecap="round" />
    </g>

    <!-- WHITE PAWN: Anak Ayam (Yellow Chick) -->
    <g v-else-if="color === 'w' && type === 'p'">
      <!-- Little tuft -->
      <path d="M32 18c-2.5-5.5 1-8 3-4.5 2-3 5-1 2.2 4.5" fill="#FFE47A" :stroke="outline" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      <!-- Round chick body/head -->
      <circle cx="32" cy="35.5" r="14.8" fill="#FFE680" :stroke="outline" stroke-width="2" />
      <!-- Tiny side wings -->
      <path d="M17.5 37c-3 1.5-2.5 6.5 1 6.5" fill="#FAD75D" :stroke="outline" stroke-width="1.8" stroke-linecap="round" />
      <path d="M46.5 37c3 1.5 2.5 6.5-1 6.5" fill="#FAD75D" :stroke="outline" stroke-width="1.8" stroke-linecap="round" />
      <!-- Eyes -->
      <circle cx="26.2" cy="34" r="2.6" :fill="outline" />
      <circle cx="37.8" cy="34" r="2.6" :fill="outline" />
      <circle cx="25.3" cy="33" r="0.9" fill="#fff" />
      <circle cx="36.9" cy="33" r="0.9" fill="#fff" />
      <!-- Heart blush -->
      <path d="M20.5 38.6c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <path d="M40.5 38.6c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <!-- Orange diamond beak -->
      <path d="M29 37.6l3-2.2 3 2.2-3 2.8z" fill="#F29538" :stroke="outline" stroke-width="1.4" stroke-linejoin="round" />
    </g>

    <!-- ==================== BLACK PIECES ==================== -->

    <!-- BLACK KING: Harimau (Tiger with 王 mark on forehead) -->
    <g v-else-if="color === 'b' && type === 'k'">
      <!-- Round ears -->
      <circle cx="19" cy="20.5" r="5.5" fill="#E69B4F" :stroke="outline" stroke-width="2" />
      <circle cx="19" cy="20.5" r="2.5" fill="#3B2B23" />
      <circle cx="45" cy="20.5" r="5.5" fill="#E69B4F" :stroke="outline" stroke-width="2" />
      <circle cx="45" cy="20.5" r="2.5" fill="#3B2B23" />
      <!-- Head -->
      <ellipse cx="32" cy="34" rx="16.2" ry="15" fill="#EA9F4E" :stroke="outline" stroke-width="2" />
      <!-- Cream muzzle -->
      <ellipse cx="32" cy="40.5" rx="8.8" ry="5.5" fill="#FFF3DC" />
      <!-- Tiger side stripes -->
      <path d="M16.5 31h4.5M17.2 35.5h4M47.5 31H43M46.8 35.5h-4" :stroke="outline" stroke-width="2" stroke-linecap="round" />
      <!-- Authentic 王 (King) mark on tiger's forehead -->
      <path
        d="M28.2 22.2h7.6M29.2 25h5.6M27.8 27.8h8.4M32 22.2v5.6"
        fill="none"
        :stroke="outline"
        stroke-width="1.7"
        stroke-linecap="round"
      />
      <!-- Eyes -->
      <circle cx="25.5" cy="34.2" r="2.6" :fill="outline" />
      <circle cx="38.5" cy="34.2" r="2.6" :fill="outline" />
      <circle cx="24.6" cy="33.2" r="0.9" fill="#fff" />
      <circle cx="37.6" cy="33.2" r="0.9" fill="#fff" />
      <!-- Heart blush -->
      <path d="M19.8 39c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <path d="M41.2 39c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <!-- Nose & smile -->
      <path d="M29.8 38h4.4l-2.2 2.2z" fill="#D4667B" :stroke="outline" stroke-width="1.1" stroke-linejoin="round" />
      <path d="M29.4 42q2.6 1.7 5.2 0" fill="none" :stroke="outline" stroke-width="1.4" stroke-linecap="round" />
    </g>

    <!-- BLACK QUEEN: Kucing (Taupe/grey-brown Cat + tiny crown) -->
    <g v-else-if="color === 'b' && type === 'q'">
      <!-- Pointed cat ears -->
      <path d="M17.5 29l2-13.5 10 6.5z" fill="#A8988E" :stroke="outline" stroke-width="2" stroke-linejoin="round" />
      <path d="M20.2 25.5l1-7 5.2 3.6z" fill="#E8B4BE" />
      <path d="M46.5 29l-2-13.5-10 6.5z" fill="#A8988E" :stroke="outline" stroke-width="2" stroke-linejoin="round" />
      <path d="M43.8 25.5l-1-7-5.2 3.6z" fill="#E8B4BE" />
      <!-- Head -->
      <ellipse cx="32" cy="35.5" rx="16" ry="14" fill="#B5A69C" :stroke="outline" stroke-width="2" />
      <!-- Mini crown -->
      <path d="M28 21.5l1.6-3.5 2.4 2.2 2.4-2.2 1.6 3.5z" fill="#EBC558" :stroke="outline" stroke-width="1.3" stroke-linejoin="round" />
      <!-- Whiskers -->
      <path d="M14 35.5l5 .6M14.5 39l4.8-.6M50 35.5l-5 .6M49.5 39l-4.8-.6" :stroke="outline" stroke-width="1.4" stroke-linecap="round" />
      <!-- Eyes -->
      <circle cx="25.8" cy="34.5" r="2.7" :fill="outline" />
      <circle cx="38.2" cy="34.5" r="2.7" :fill="outline" />
      <circle cx="24.9" cy="33.5" r="0.9" fill="#fff" />
      <circle cx="37.3" cy="33.5" r="0.9" fill="#fff" />
      <!-- Heart blush -->
      <path d="M20.2 39.2c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <path d="M40.8 39.2c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <!-- Nose & cat mouth -->
      <path d="M30.2 38h3.6l-1.8 1.8z" fill="#E38A9E" />
      <path d="M29.4 40.8q1.3 1.5 2.6 0q1.3 1.5 2.6 0" fill="none" :stroke="outline" stroke-width="1.4" stroke-linecap="round" />
    </g>

    <!-- BLACK ROOK: Beruang (Warm brown Bear) -->
    <g v-else-if="color === 'b' && type === 'r'">
      <!-- Round bear ears -->
      <circle cx="19" cy="21" r="6" fill="#8C634A" :stroke="outline" stroke-width="2" />
      <circle cx="19" cy="21" r="2.8" fill="#D9B39B" />
      <circle cx="45" cy="21" r="6" fill="#8C634A" :stroke="outline" stroke-width="2" />
      <circle cx="45" cy="21" r="2.8" fill="#D9B39B" />
      <!-- Head -->
      <ellipse cx="32" cy="34.5" rx="16.2" ry="15" fill="#9B7056" :stroke="outline" stroke-width="2" />
      <!-- Light cream muzzle -->
      <ellipse cx="32" cy="40.5" rx="8.4" ry="5.8" fill="#F4DFCD" />
      <!-- Eyes -->
      <circle cx="25.6" cy="33.2" r="2.6" :fill="outline" />
      <circle cx="38.4" cy="33.2" r="2.6" :fill="outline" />
      <circle cx="24.7" cy="32.2" r="0.9" fill="#fff" />
      <circle cx="37.5" cy="32.2" r="0.9" fill="#fff" />
      <!-- Heart blush -->
      <path d="M19.8 38c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <path d="M41.2 38c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <!-- Nose & smile -->
      <ellipse cx="32" cy="38.2" rx="2.8" ry="2" :fill="outline" />
      <path d="M29.4 42q2.6 1.7 5.2 0" fill="none" :stroke="outline" stroke-width="1.5" stroke-linecap="round" />
    </g>

    <!-- BLACK BISHOP: Penguin (Black & White Penguin) -->
    <g v-else-if="color === 'b' && type === 'b'">
      <!-- Outer dark penguin head/body -->
      <ellipse cx="32" cy="34" rx="15.8" ry="16.2" fill="#343B4A" :stroke="outline" stroke-width="2" />
      <!-- White heart-shaped inner face -->
      <path
        d="M32 27.5c-2.8-3.8-10.8-2.8-11.2 5.2-.4 8 5.2 15.8 11.2 15.8s11.6-7.8 11.2-15.8c-.4-8-8.4-9-11.2-5.2z"
        fill="#FAFBFD"
      />
      <!-- Tiny flipper wings -->
      <path d="M16.5 36.5c-3 2-2.2 7.5 1.6 7" fill="#343B4A" :stroke="outline" stroke-width="1.8" stroke-linecap="round" />
      <path d="M47.5 36.5c3 2 2.2 7.5-1.6 7" fill="#343B4A" :stroke="outline" stroke-width="1.8" stroke-linecap="round" />
      <!-- Eyes -->
      <circle cx="25.8" cy="33.5" r="2.6" :fill="outline" />
      <circle cx="38.2" cy="33.5" r="2.6" :fill="outline" />
      <circle cx="24.9" cy="32.5" r="0.9" fill="#fff" />
      <circle cx="37.3" cy="32.5" r="0.9" fill="#fff" />
      <!-- Heart blush -->
      <path d="M20.4 38.2c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <path d="M40.6 38.2c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <!-- Orange beak -->
      <path d="M28.6 37.2q3.4-2 6.8 0l-3.4 3.4z" fill="#F29D38" :stroke="outline" stroke-width="1.4" stroke-linejoin="round" />
    </g>

    <!-- BLACK KNIGHT: Koala (Blue-grey Koala) -->
    <g v-else-if="color === 'b' && type === 'n'">
      <!-- Fluffy big koala ears -->
      <circle cx="15.5" cy="27.5" r="8.5" fill="#8EA2B8" :stroke="outline" stroke-width="2" />
      <circle cx="16.2" cy="28" r="4.5" fill="#DCE4EC" />
      <circle cx="48.5" cy="27.5" r="8.5" fill="#8EA2B8" :stroke="outline" stroke-width="2" />
      <circle cx="47.8" cy="28" r="4.5" fill="#DCE4EC" />
      <!-- Head -->
      <ellipse cx="32" cy="35" rx="15.5" ry="14.5" fill="#9BB0C6" :stroke="outline" stroke-width="2" />
      <!-- Eyes -->
      <circle cx="24.8" cy="34.2" r="2.5" :fill="outline" />
      <circle cx="39.2" cy="34.2" r="2.5" :fill="outline" />
      <circle cx="24" cy="33.2" r="0.85" fill="#fff" />
      <circle cx="38.4" cy="33.2" r="0.85" fill="#fff" />
      <!-- Heart blush -->
      <path d="M19.5 39c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <path d="M41.5 39c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <!-- Signature oval koala nose -->
      <ellipse cx="32" cy="37.4" rx="3.8" ry="5" fill="#3B424E" :stroke="outline" stroke-width="1.4" />
      <ellipse cx="31" cy="35.6" rx="1" ry="1.4" fill="#fff" opacity="0.45" />
    </g>

    <!-- BLACK PAWN: Babi (Pink pastel Pig) -->
    <g v-else>
      <!-- Cute folded pig ears -->
      <path d="M18 26c-2-6 1-10.5 7-8.5l2 5z" fill="#F29EB3" :stroke="outline" stroke-width="2" stroke-linejoin="round" />
      <path d="M46 26c2-6-1-10.5-7-8.5l-2 5z" fill="#F29EB3" :stroke="outline" stroke-width="2" stroke-linejoin="round" />
      <!-- Round pig head -->
      <circle cx="32" cy="35.5" r="15" fill="#F7B8C7" :stroke="outline" stroke-width="2" />
      <!-- Eyes -->
      <circle cx="25.5" cy="33" r="2.5" :fill="outline" />
      <circle cx="38.5" cy="33" r="2.5" :fill="outline" />
      <circle cx="24.6" cy="32" r="0.85" fill="#fff" />
      <circle cx="37.6" cy="32" r="0.85" fill="#fff" />
      <!-- Heart blush -->
      <path d="M19.8 38.2c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <path d="M41.2 38.2c0-1 .8-1.6 1.5-1 .7-.6 1.5 0 1.5 1 0 1.1-1.5 2-1.5 2s-1.5-.9-1.5-2z" :fill="blush" />
      <!-- Oval pig snout -->
      <ellipse cx="32" cy="39.5" rx="6.5" ry="4.4" fill="#F28EA6" :stroke="outline" stroke-width="1.6" />
      <ellipse cx="29.8" cy="39.5" rx="1.2" ry="1.8" :fill="outline" />
      <ellipse cx="34.2" cy="39.5" rx="1.2" ry="1.8" :fill="outline" />
    </g>
  </svg>
</template>

import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Search, Wrench, ChevronDown, ChevronUp, Copy, Check, RefreshCw,
  Trash2, CheckCircle2, Radio, Sparkles, Pin
} from 'lucide-react';

// ============================================================================
// 1. ENGINE ĐỒNG BỘ TỰ ĐỘNG & BỘ MÃ HÓA TEAM PLANNER CODE IN-GAME
// ============================================================================
const CDRAGON_TFT_JSON = 'https://raw.communitydragon.org/latest/cdragon/tft/en_us.json';

function resolveCDragonAssetUrl(texPath) {
  if (!texPath) return '';
  const cleaned = texPath
    .toLowerCase()
    .replace(/\.tex$/, '.png')
    .replace(/^assets\//, 'assets/');
  return `https://raw.communitydragon.org/latest/game/${cleaned}`;
}

// Bảng mã Hex chuẩn của các tướng & quái Set 18 để xuất/nhập Team Planner Code vào ĐTCL
const CHAMPIONS_HEX_ROSTER = [
  { key: 'Morgana', name: 'Morgana', cost: 4, hexCode: '04' },
  { key: 'Shen', name: 'Shen', cost: 2, hexCode: '08' },
  { key: 'Alune', name: 'Alune', cost: 5, hexCode: '0C' },
  { key: 'Ornn', name: 'Ornn', cost: 4, hexCode: '10' },
  { key: 'Taric', name: 'Taric', cost: 5, hexCode: '14' },
  { key: 'Cassiopeia', name: 'Cassiopeia', cost: 2, hexCode: '18' },
  { key: 'Diana', name: 'Diana', cost: 3, hexCode: '1C' },
  { key: 'Elise', name: 'Elise', cost: 1, hexCode: '20' },
  { key: 'Teemo', name: 'Teemo', cost: 2, hexCode: '24' },
  { key: 'Alistar', name: 'Alistar', cost: 2, hexCode: '28' },
  { key: 'Leblanc', name: 'LeBlanc', cost: 2, hexCode: '2C' },
  { key: 'Hecarim', name: 'Hecarim', cost: 3, hexCode: '30' },
  { key: 'Maokai', name: 'Maokai', cost: 1, hexCode: '34' },
  { key: 'Veigar', name: 'Veigar', cost: 3, hexCode: '38' },
  { key: 'Ahri', name: 'Ahri', cost: 4, hexCode: '3C' },
  { key: 'Ivern', name: 'Ivern', cost: 5, hexCode: '40' },
  { key: 'Lillia', name: 'Lillia', cost: 4, hexCode: '44' },
  { key: 'Rakan', name: 'Rakan', cost: 2, hexCode: '48' },
  { key: 'Xayah', name: 'Xayah', cost: 5, hexCode: '4C' },
  { key: 'Gnar', name: 'Gnar', cost: 5, hexCode: '50' },
  { key: 'Neeko', name: 'Neeko', cost: 2, hexCode: '54' },
  { key: 'Azir', name: 'Azir', cost: 3, hexCode: '58' },
  { key: 'Zyra', name: 'Zyra', cost: 5, hexCode: '5C' },
  { key: 'Soraka', name: 'Soraka', cost: 3, hexCode: '60' },
  { key: 'Nidalee', name: 'Nidalee', cost: 4, hexCode: '64' },
  { key: 'Aphelios', name: 'Aphelios', cost: 4, hexCode: '68' },
  { key: 'Amumu', name: 'Amumu', cost: 3, hexCode: '6C' },
  { key: 'Vi', name: 'Vi', cost: 2, hexCode: '70' },
  { key: 'Varus', name: 'Varus', cost: 2, hexCode: '74' },
  { key: 'Sentinel', name: 'Sentinel', cost: 4, hexCode: '78' },
  { key: 'ElderDragon', name: 'Elder Dragon', cost: 5, hexCode: '7C' },
  { key: 'Brambleback', name: 'Brambleback', cost: 4, hexCode: '80' },
  { key: 'Krug', name: 'Krug', cost: 2, hexCode: '84' },
  { key: 'Murkwolf', name: 'Murkwolf', cost: 2, hexCode: '88' },
  { key: 'Pebbles', name: 'Pebbles', cost: 1, hexCode: '8C' },
  { key: 'Kobuko', name: 'Kobuko', cost: 2, hexCode: '90' },
  { key: 'Fiddlesticks', name: 'Fiddlesticks', cost: 3, hexCode: '94' },
  { key: 'Rammus', name: 'Rammus', cost: 3, hexCode: '98' },
  { key: 'KogMaw', name: "Kog'Maw", cost: 3, hexCode: '9C' }
];

const CHAMP_BY_KEY = new Map(CHAMPIONS_HEX_ROSTER.map(c => [c.key.toLowerCase(), c]));
const CHAMP_BY_HEX = new Map(CHAMPIONS_HEX_ROSTER.map(c => [c.hexCode, c]));

function encodeTeamPlannerCode(units, setTag = 'TFTSet18') {
  const slots = [];
  for (let i = 0; i < 10; i++) {
    const u = units[i];
    if (u) {
      const cleanKey = (u.key || u.name || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const found = CHAMP_BY_KEY.get(cleanKey);
      slots.push(found ? found.hexCode : '04');
    } else {
      slots.push('00');
    }
  }
  return `01${slots.join('')}${setTag}`;
}

function decodeTeamPlannerCode(codeStr) {
  if (!codeStr || typeof codeStr !== 'string' || codeStr.length < 22) return null;
  try {
    const clean = codeStr.trim();
    const setTag = clean.slice(-8) || 'TFTSet18';
    const hexBody = clean.slice(2, -8);
    const newUnits = [];
    let row = 3, col = 0;
    for (let i = 0; i < hexBody.length; i += 2) {
      const hexPair = hexBody.substr(i, 2).toUpperCase();
      if (hexPair && hexPair !== '00') {
        const champ = CHAMP_BY_HEX.get(hexPair);
        if (champ) {
          newUnits.push({ key: champ.key, name: champ.name, cost: champ.cost, star: 2, row, col: col % 7, items: [] });
          col++;
          if (col >= 7) { col = 0; row = Math.max(0, row - 1); }
        }
      }
    }
    return { units: newUnits, setTag };
  } catch (_) {
    return null;
  }
}

// ============================================================================
// 2. DANH MỤC LÕI NÂNG CẤP (AUGMENTS CATALOG) & TRANG BỊ
// ============================================================================
const AUGMENTS_CATALOG = {
  vanguard_crest: {
    id: 'vanguard_crest',
    name: 'Huy Hiệu Hộ Vệ (Vanguard Crest)',
    tier: 'Gold',
    avgPlace: 3.78,
    desc: 'Nhận 1 Ấn Hộ Vệ và 1 tướng Hộ Vệ.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/trait_crest_generic.tft_set11.png'
  },
  coven_crown: {
    id: 'coven_crown',
    name: 'Vương Miện Tiên Hắc Ám (Coven Crown)',
    tier: 'Prismatic',
    avgPlace: 3.62,
    desc: 'Nhận 1 Ấn Tiên Hắc Ám, 1 Bùa Xanh và 1 Morgana.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/trait_crown_generic.tft_set11.png'
  },
  invoker_crest: {
    id: 'invoker_crest',
    name: 'Huy Hiệu Thuật Sĩ (Invoker Crest)',
    tier: 'Gold',
    avgPlace: 3.84,
    desc: 'Nhận 1 Ấn Thuật Sĩ và 1 tướng Thuật Sĩ.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/trait_crest_generic.tft_set11.png'
  },
  riftbeast_crown: {
    id: 'riftbeast_crown',
    name: 'Vương Miện Quái Vật (Riftbeast Crown)',
    tier: 'Prismatic',
    avgPlace: 3.55,
    desc: 'Nhận 1 Ấn Riftbeast, 1 Quyền Năng Khổng Lồ và 1 Krug.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/trait_crown_generic.tft_set11.png'
  },
  lunar_crest: {
    id: 'lunar_crest',
    name: 'Huy Hiệu Nguyệt Tộc (Lunar Crest)',
    tier: 'Gold',
    avgPlace: 3.89,
    desc: 'Nhận 1 Ấn Nguyệt Tộc và 1 Diana.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/trait_crest_generic.tft_set11.png'
  },
  jeweled_lotus_2: {
    id: 'jeweled_lotus_2',
    name: 'Khảm Bảo Thạch II (Jeweled Lotus II)',
    tier: 'Gold',
    avgPlace: 3.85,
    desc: 'Kỹ năng của đội có thể chí mạng và nhận thêm 20% Tỉ lệ Chí mạng.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/jeweledlotus2.png'
  },
  jeweled_lotus_3: {
    id: 'jeweled_lotus_3',
    name: 'Khảm Bảo Thạch III (Jeweled Lotus III)',
    tier: 'Prismatic',
    avgPlace: 3.68,
    desc: 'Kỹ năng của đội có thể chí mạng và nhận thêm 45% Tỉ lệ Chí mạng.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/jeweledlotus3.png'
  },
  cybernetic_bulk_2: {
    id: 'cybernetic_bulk_2',
    name: 'Giáp Năng Lượng II (Cybernetic Bulk II)',
    tier: 'Gold',
    avgPlace: 3.92,
    desc: 'Tướng mang trang bị nhận thêm 300 Máu.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/cyberneticbulk2.png'
  },
  healing_orbs_2: {
    id: 'healing_orbs_2',
    name: 'Cầu Hồi Phục II (Healing Orbs II)',
    tier: 'Gold',
    avgPlace: 3.88,
    desc: 'Khi kẻ địch bị hạ gục, đồng minh gần nhất hồi 450 Máu.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/healingorbs2.png'
  },
  magic_wand: {
    id: 'magic_wand',
    name: 'Đũa Phép (Magic Wand)',
    tier: 'Gold',
    avgPlace: 3.94,
    desc: 'Nhận 1 Gậy Quá Khổ. Toàn đội nhận +18 Sức Mạnh Phép Thuật.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/magicwand.png'
  },
  level_up: {
    id: 'level_up',
    name: 'Khuyến Mãi Kinh Nghiệm (Level Up!)',
    tier: 'Prismatic',
    avgPlace: 3.71,
    desc: 'Khi mua XP, nhận thêm 3 XP. Bạn có thể lên thẳng Cấp 10.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/levelup.png'
  },
  prismatic_ticket: {
    id: 'prismatic_ticket',
    name: 'Vé Kim Cương (Prismatic Ticket)',
    tier: 'Prismatic',
    avgPlace: 3.65,
    desc: 'Mỗi khi đổi lại Cửa Hàng, bạn có 45% tỉ lệ nhận thêm 1 lần đổi miễn phí.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/goldenticket3.png'
  },
  trade_sector: {
    id: 'trade_sector',
    name: 'Khu Giao Dịch (Trade Sector)',
    tier: 'Gold',
    avgPlace: 3.91,
    desc: 'Nhận 1 lượt đổi Cửa Hàng miễn phí mỗi vòng đấu. Nhận 4 vàng.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/tradesector.png'
  },
  patient_study: {
    id: 'patient_study',
    name: 'Học Hỏi Kiên Nhẫn (Patient Study)',
    tier: 'Gold',
    avgPlace: 3.86,
    desc: 'Sau giao tranh, nhận 2 XP nếu thắng hoặc 3 XP nếu thua.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/patientstudy.png'
  },
  pandoras_items: {
    id: 'pandoras_items',
    name: 'Hộp Pandora (Pandora\'s Items)',
    tier: 'Silver',
    avgPlace: 3.98,
    desc: 'Đầu mỗi vòng, trang bị trên hàng chờ sẽ biến đổi ngẫu nhiên.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/pandorasitems1.png'
  },
  component_buffet: {
    id: 'component_buffet',
    name: 'Tiệc Trang Bị (Component Buffet)',
    tier: 'Silver',
    avgPlace: 3.95,
    desc: 'Mỗi khi nhận mảnh trang bị, biến nó thành Gói Trang Bị Thành Phần.',
    icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/componentbuffet1.png'
  }
};

const ITEMS_CATALOG = {
  bluebuff: { id: 'bluebuff', name: 'Blue Buff', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_BlueBuff.png' },
  jeweled: { id: 'jeweled', name: 'Jeweled Gauntlet', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_JeweledGauntlet.png' },
  morello: { id: 'morello', name: 'Morellonomicon', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_Morellonomicon.png' },
  warmog: { id: 'warmog', name: "Warmog's Armor", icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_WarmogsArmor.png' },
  bramble: { id: 'bramble', name: 'Bramble Vest', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_BrambleVest.png' },
  dclaw: { id: 'dclaw', name: "Dragon's Claw", icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_DragonsClaw.png' },
  gargoyle: { id: 'gargoyle', name: 'Gargoyle Stoneplate', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_GargoyleStoneplate.png' },
  shojin: { id: 'shojin', name: 'Spear of Shojin', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_SpearOfShojin.png' },
  archangel: { id: 'archangel', name: "Archangel's Staff", icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_ArchangelsStaff.png' },
  nashor: { id: 'nashor', name: "Nashor's Tooth", icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_Leviathan.png' },
  guinsoo: { id: 'guinsoo', name: "Guinsoo's Rageblade", icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_GuinsoosRageblade.png' },
  ie: { id: 'ie', name: 'Infinity Edge', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_InfinityEdge.png' },
  lw: { id: 'lw', name: 'Last Whisper', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_LastWhisper.png' },
  bt: { id: 'bt', name: 'Bloodthirster', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_Bloodthirster.png' },
  titans: { id: 'titans', name: "Titan's Resolve", icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_TitansResolve.png' },
  hoj: { id: 'hoj', name: 'Hand of Justice', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_UnstableConcoction.png' },
  guardbreaker: { id: 'guardbreaker', name: 'Guardbreaker', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_PowerGauntlet.png' },
  redemption: { id: 'redemption', name: 'Redemption', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_Redemption.png' },
  gunblade: { id: 'gunblade', name: 'Hextech Gunblade', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_HextechGunblade.png' },
  ionic: { id: 'ionic', name: 'Ionic Spark', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_IonicSpark.png' },
  crownguard: { id: 'crownguard', name: 'Crownguard', icon: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_Crownguard.png' }
};

// ============================================================================
// 3. DANH SÁCH ĐỘI HÌNH META SET 18 CHUẨN
// ============================================================================
const FALLBACK_SET18_COMPS = [
  {
    id: 'vanguard-morgana',
    tier: 'S',
    name: 'Vanguard Morgana',
    playstyle: 'Fast 9',
    difficulty: 'Easy',
    avgPlace: 4.03,
    pickRate: 0.18,
    winRate: 22.1,
    top4Rate: 57.1,
    setTag: 'TFTSet18',
    earlyUnits: ['Elise', 'Cassiopeia', 'Diana', 'Amumu'],
    leveling: 'Lv4 (2-1) → Lv6 (3-2) → Lv8 (4-2) → Lv9 (5-2)',
    carousel: 'Nước Mắt > Gậy Quá Khổ > Đai Khổng Lồ',
    augments: ['coven_crown', 'jeweled_lotus_2', 'vanguard_crest', 'level_up'],
    traits: [
      { name: 'Vanguard', count: 4, style: 'silver' },
      { name: 'Coven', count: 3, style: 'bronze' },
      { name: 'Invoker', count: 3, style: 'bronze' },
      { name: 'Lunar', count: 2, style: 'bronze' },
      { name: 'Riftbeast', count: 2, style: 'bronze' },
      { name: 'Apex Predator', count: 1, style: 'gold' },
      { name: 'Attuned', count: 1, style: 'gold' },
      { name: 'Emerald Aspect', count: 1, style: 'gold' }
    ],
    units: [
      { key: 'Morgana', name: 'Morgana', cost: 4, star: 2, row: 3, col: 0, items: ['bluebuff', 'jeweled', 'morello'] },
      { key: 'Alune', name: 'Alune', cost: 5, star: 2, row: 3, col: 6, items: ['shojin', 'archangel', 'jeweled'] },
      { key: 'Sentinel', name: 'Sentinel', cost: 4, star: 2, row: 0, col: 3, items: ['warmog', 'bramble', 'gargoyle'] },
      { key: 'ElderDragon', name: 'Elder Dragon', cost: 5, star: 2, row: 1, col: 3, items: [] },
      { key: 'Taric', name: 'Taric', cost: 5, star: 2, row: 0, col: 4, items: [] },
      { key: 'Cassiopeia', name: 'Cassiopeia', cost: 2, star: 2, row: 3, col: 1, items: [] },
      { key: 'Diana', name: 'Diana', cost: 3, star: 2, row: 0, col: 2, items: [] },
      { key: 'Elise', name: 'Elise', cost: 1, star: 2, row: 0, col: 1, items: [] }
    ]
  },
  {
    id: 'invoker-teemo-alistar',
    tier: 'S',
    name: 'Invoker Teemo Alistar',
    playstyle: 'lvl 6',
    difficulty: 'Easy',
    avgPlace: 4.16,
    pickRate: 0.20,
    winRate: 7.3,
    top4Rate: 58.8,
    setTag: 'TFTSet18',
    earlyUnits: ['Teemo', 'Alistar', 'Kobuko', 'Leblanc'],
    leveling: 'Slow Roll ở Cấp 6 (giữ trên 50 vàng) để lên Teemo 3★ & Alistar 3★',
    carousel: 'Nước Mắt > Gậy Quá Khổ > Giáp Lưới',
    augments: ['prismatic_ticket', 'trade_sector', 'invoker_crest', 'jeweled_lotus_2'],
    traits: [
      { name: 'Vanguard', count: 3, style: 'silver' },
      { name: 'Coven', count: 3, style: 'bronze' },
      { name: 'Invoker', count: 3, style: 'bronze' },
      { name: 'Brawler', count: 2, style: 'bronze' },
      { name: 'Elderwood', count: 2, style: 'bronze' },
      { name: 'Sprykin', count: 2, style: 'bronze' }
    ],
    units: [
      { key: 'Teemo', name: 'Teemo', cost: 2, star: 3, row: 3, col: 0, items: ['bluebuff', 'jeweled', 'morello'] },
      { key: 'Alistar', name: 'Alistar', cost: 2, star: 3, row: 0, col: 3, items: ['warmog', 'bramble', 'dclaw'] },
      { key: 'Leblanc', name: 'LeBlanc', cost: 2, star: 3, row: 3, col: 2, items: ['shojin', 'nashor', 'jeweled'] },
      { key: 'Morgana', name: 'Morgana', cost: 4, star: 2, row: 3, col: 4, items: ['morello'] },
      { key: 'Sentinel', name: 'Sentinel', cost: 4, star: 2, row: 0, col: 2, items: [] },
      { key: 'Hecarim', name: 'Hecarim', cost: 3, star: 2, row: 0, col: 4, items: [] },
      { key: 'Kobuko', name: 'Kobuko', cost: 2, star: 3, row: 0, col: 1, items: [] },
      { key: 'Veigar', name: 'Veigar', cost: 3, star: 3, row: 3, col: 6, items: [] }
    ]
  },
  {
    id: 'vanguard-alune',
    tier: 'S',
    name: 'Vanguard Alune',
    playstyle: 'Fast 9',
    difficulty: 'Hard',
    avgPlace: 4.17,
    pickRate: 0.30,
    winRate: 19.9,
    top4Rate: 54.6,
    setTag: 'TFTSet18',
    earlyUnits: ['Rakan', 'Diana', 'Soraka', 'Amumu'],
    leveling: 'Lv4 (2-1) → Lv6 (3-2) → Lv8 (4-2) → Lv9 (5-1)',
    carousel: 'Kiếm B.F > Nước Mắt > Gậy Quá Khổ',
    augments: ['level_up', 'patient_study', 'vanguard_crest', 'jeweled_lotus_3'],
    traits: [
      { name: 'Vanguard', count: 4, style: 'silver' },
      { name: 'Blossom', count: 2, style: 'bronze' },
      { name: 'Invoker', count: 2, style: 'bronze' },
      { name: 'Lunar', count: 2, style: 'bronze' },
      { name: 'Spellweaver', count: 2, style: 'bronze' },
      { name: 'Attuned', count: 1, style: 'gold' },
      { name: 'Emerald Aspect', count: 1, style: 'gold' },
      { name: 'Greenfather', count: 1, style: 'gold' }
    ],
    units: [
      { key: 'Alune', name: 'Alune', cost: 5, star: 2, row: 3, col: 6, items: ['shojin', 'jeweled', 'guardbreaker'] },
      { key: 'Morgana', name: 'Morgana', cost: 4, star: 2, row: 3, col: 4, items: ['morello', 'shojin', 'archangel'] },
      { key: 'Sentinel', name: 'Sentinel', cost: 4, star: 2, row: 0, col: 3, items: ['warmog', 'bramble', 'dclaw'] },
      { key: 'Taric', name: 'Taric', cost: 5, star: 2, row: 0, col: 4, items: ['gargoyle', 'redemption'] },
      { key: 'Ivern', name: 'Ivern', cost: 5, star: 2, row: 1, col: 2, items: [] },
      { key: 'Lillia', name: 'Lillia', cost: 4, star: 2, row: 0, col: 2, items: [] },
      { key: 'Diana', name: 'Diana', cost: 3, star: 2, row: 0, col: 1, items: [] },
      { key: 'Fiddlesticks', name: 'Fiddlesticks', cost: 3, star: 2, row: 1, col: 5, items: [] },
      { key: 'Rakan', name: 'Rakan', cost: 2, star: 2, row: 0, col: 5, items: [] }
    ]
  },
  {
    id: 'riftbeast-brambleback',
    tier: 'S',
    name: 'Riftbeast Brambleback',
    playstyle: 'Fast 8',
    difficulty: 'Easy',
    avgPlace: 4.23,
    pickRate: 0.70,
    winRate: 13.4,
    top4Rate: 54.9,
    setTag: 'TFTSet18',
    earlyUnits: ['Pebbles', 'Krug', 'Murkwolf', 'Vi'],
    leveling: 'Lv4 (2-1) → Lv6 (3-2) → Lv8 (4-2) Roll tìm Brambleback 2★ & Krug 3★',
    carousel: 'Cung Gỗ > Kiếm B.F > Đai Khổng Lồ',
    augments: ['riftbeast_crown', 'healing_orbs_2', 'cybernetic_bulk_2', 'pandoras_items'],
    traits: [
      { name: 'Riftbeast', count: 7, style: 'gold' },
      { name: 'Brawler', count: 2, style: 'bronze' },
      { name: 'Invoker', count: 2, style: 'bronze' },
      { name: 'Ravager', count: 2, style: 'bronze' },
      { name: 'Vanguard', count: 2, style: 'bronze' },
      { name: 'Apex Predator', count: 1, style: 'gold' },
      { name: 'Emerald Aspect', count: 1, style: 'gold' }
    ],
    units: [
      { key: 'Brambleback', name: 'Brambleback', cost: 4, star: 2, row: 3, col: 1, items: ['guinsoo', 'ie', 'hoj'] },
      { key: 'Krug', name: 'Krug', cost: 2, star: 3, row: 0, col: 3, items: ['warmog', 'bramble', 'gargoyle'] },
      { key: 'ElderDragon', name: 'Elder Dragon', cost: 5, star: 2, row: 1, col: 3, items: ['ie', 'lw', 'bt'] },
      { key: 'Sentinel', name: 'Sentinel', cost: 4, star: 2, row: 0, col: 4, items: ['redemption'] },
      { key: 'Gnar', name: 'Gnar', cost: 5, star: 2, row: 0, col: 2, items: [] },
      { key: 'Taric', name: 'Taric', cost: 5, star: 2, row: 0, col: 5, items: [] },
      { key: 'Murkwolf', name: 'Murkwolf', cost: 2, star: 2, row: 1, col: 1, items: [] },
      { key: 'Pebbles', name: 'Pebbles', cost: 1, star: 3, row: 3, col: 5, items: [] }
    ]
  },
  {
    id: 'flora-fatalis-azir',
    tier: 'S',
    name: 'Flora Fatalis Azir',
    playstyle: 'lvl 7',
    difficulty: 'Medium',
    avgPlace: 4.25,
    pickRate: 0.23,
    winRate: 12.6,
    top4Rate: 55.1,
    setTag: 'TFTSet18',
    earlyUnits: ['Teemo', 'Rammus', 'Soraka', 'Veigar'],
    leveling: 'Slow Roll ở Cấp 7 để nâng Azir 3★, Rammus 3★ và Fiddlesticks 3★',
    carousel: 'Gậy Quá Khổ > Cung Gỗ > Giáp Lưới',
    augments: ['prismatic_ticket', 'magic_wand', 'trade_sector', 'healing_orbs_2'],
    traits: [
      { name: 'Flora Fatalis', count: 2, style: 'gold' },
      { name: 'Sprykin', count: 3, style: 'silver' },
      { name: 'Defender', count: 2, style: 'bronze' },
      { name: 'Invoker', count: 2, style: 'bronze' },
      { name: 'Spellweaver', count: 2, style: 'bronze' },
      { name: 'Thornmaiden', count: 1, style: 'gold' }
    ],
    units: [
      { key: 'Azir', name: 'Azir', cost: 3, star: 3, row: 3, col: 0, items: ['guinsoo', 'archangel', 'gunblade'] },
      { key: 'Rammus', name: 'Rammus', cost: 3, star: 3, row: 0, col: 3, items: ['warmog', 'bramble', 'gargoyle'] },
      { key: 'Zyra', name: 'Zyra', cost: 5, star: 2, row: 3, col: 2, items: ['shojin', 'morello'] },
      { key: 'Fiddlesticks', name: 'Fiddlesticks', cost: 3, star: 3, row: 1, col: 3, items: ['ionic', 'crownguard'] },
      { key: 'Soraka', name: 'Soraka', cost: 3, star: 2, row: 3, col: 4, items: [] },
      { key: 'Teemo', name: 'Teemo', cost: 2, star: 3, row: 3, col: 5, items: [] },
      { key: 'Veigar', name: 'Veigar', cost: 3, star: 2, row: 3, col: 6, items: [] }
    ]
  },
  {
    id: 'lunar-nidalee',
    tier: 'A',
    name: 'Lunar Nidalee',
    playstyle: 'Fast 8',
    difficulty: 'Medium',
    avgPlace: 4.32,
    pickRate: 0.22,
    winRate: 7.4,
    top4Rate: 55.8,
    setTag: 'TFTSet18',
    earlyUnits: ['Vi', 'Varus', 'Diana', 'Amumu'],
    leveling: 'Lv4 (2-1) → Lv6 (3-2) → Lv8 (4-2) Roll tìm Nidalee 2★ & Aphelios 2★',
    carousel: 'Kiếm B.F > Cung Gỗ > Áo Choàng Bạc',
    augments: ['lunar_crest', 'cybernetic_bulk_2', 'component_buffet', 'healing_orbs_2'],
    traits: [
      { name: 'Lunar', count: 4, style: 'gold' },
      { name: 'Hunter', count: 2, style: 'bronze' },
      { name: 'Invoker', count: 2, style: 'bronze' },
      { name: 'Vanguard', count: 2, style: 'bronze' }
    ],
    units: [
      { key: 'Nidalee', name: 'Nidalee', cost: 4, star: 2, row: 1, col: 1, items: ['bt', 'titans', 'hoj'] },
      { key: 'Aphelios', name: 'Aphelios', cost: 4, star: 2, row: 3, col: 6, items: ['guinsoo', 'ie', 'lw'] },
      { key: 'Amumu', name: 'Amumu', cost: 3, star: 2, row: 0, col: 3, items: ['warmog', 'bramble', 'dclaw'] },
      { key: 'Sentinel', name: 'Sentinel', cost: 4, star: 2, row: 0, col: 4, items: [] },
      { key: 'Diana', name: 'Diana', cost: 3, star: 2, row: 0, col: 2, items: [] },
      { key: 'KogMaw', name: "Kog'Maw", cost: 3, star: 2, row: 3, col: 4, items: [] },
      { key: 'Vi', name: 'Vi', cost: 2, star: 2, row: 0, col: 1, items: [] },
      { key: 'Varus', name: 'Varus', cost: 2, star: 2, row: 3, col: 5, items: [] }
    ]
  }
];

// ============================================================================
// 4. CÁC COMPONENT GIAO DIỆN CHI TIẾT
// ============================================================================
const AugmentBadge = ({ augId, compact = false }) => {
  const [imgErr, setImgErr] = useState(false);
  const aug = AUGMENTS_CATALOG[augId] || {
    id: augId,
    name: augId,
    tier: 'Gold',
    avgPlace: 3.9,
    desc: 'Lõi nâng cấp đề xuất trong Meta.'
  };

  const tierStyles = {
    Prismatic: 'bg-gradient-to-r from-fuchsia-950/80 via-indigo-950/80 to-cyan-950/80 border-fuchsia-400/60 text-fuchsia-200',
    Gold: 'bg-[#2a2315] border-[#d49b27]/60 text-[#fbd38d]',
    Silver: 'bg-[#21252e] border-slate-400/50 text-slate-200'
  };

  const dotColors = {
    Prismatic: 'bg-fuchsia-400',
    Gold: 'bg-amber-400',
    Silver: 'bg-slate-300'
  };

  if (compact) {
    return (
      <div
        title={`${aug.name} — ${aug.desc} (Avg Place: #${aug.avgPlace})`}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold ${tierStyles[aug.tier] || tierStyles.Gold}`}
      >
        {!imgErr && aug.icon ? (
          <img src={aug.icon} alt={aug.name} onError={() => setImgErr(true)} className="w-3.5 h-3.5 rounded-sm object-cover" />
        ) : (
          <span className={`w-2 h-2 rounded-full ${dotColors[aug.tier] || dotColors.Gold}`} />
        )}
        <span className="truncate max-w-[140px]">{aug.name.split(' (')[0]}</span>
      </div>
    );
  }

  return (
    <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${tierStyles[aug.tier] || tierStyles.Gold}`}>
      <div className="w-9 h-9 rounded bg-black/40 border border-white/15 shrink-0 flex items-center justify-center overflow-hidden">
        {!imgErr && aug.icon ? (
          <img src={aug.icon} alt={aug.name} onError={() => setImgErr(true)} className="w-full h-full object-cover" />
        ) : (
          <Sparkles className="w-4 h-4 text-amber-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-white truncate">{aug.name}</span>
          <span className="text-[10px] font-black text-emerald-400 shrink-0">#{aug.avgPlace} Avg</span>
        </div>
        <p className="text-[11px] text-gray-300/90 mt-0.5 leading-snug">{aug.desc}</p>
      </div>
    </div>
  );
};

const ChampionPortraitTile = ({ unit, dynamicChampMap, size = 'md', showName = true, onClick }) => {
  const [fallbackStep, setFallbackStep] = useState(0);
  const cleanKey = (unit.key || unit.name || '').replace(/[^a-zA-Z0-9]/g, '');
  const lowerKey = cleanKey.toLowerCase();

  const candidateUrls = useMemo(() => {
    const list = [];
    if (dynamicChampMap && dynamicChampMap[lowerKey]?.iconUrl) {
      list.push(dynamicChampMap[lowerKey].iconUrl);
    }
    list.push(`https://cdn.metatft.com/file/metatft/champions/da_18_${lowerKey}.png`);
    list.push(`https://cdn.metatft.com/file/metatft/champions/tft18_${lowerKey}.png`);
    list.push(`https://cdn.metatft.com/file/metatft/champions/${lowerKey}.png`);
    list.push(`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${cleanKey}.png`);
    return list;
  }, [lowerKey, cleanKey, dynamicChampMap]);

  const currentImgUrl = candidateUrls[Math.min(fallbackStep, candidateUrls.length - 1)];

  const costBorders = {
    1: 'border-[#788292]',
    2: 'border-[#11b288]',
    3: 'border-[#207ac7]',
    4: 'border-[#c440da]',
    5: 'border-[#ffb93b]'
  };

  const sizeDims = { sm: 'w-9 h-9', md: 'w-12 h-12', lg: 'w-14 h-14' };
  const cost = dynamicChampMap?.[lowerKey]?.cost || unit.cost || 3;

  return (
    <div onClick={onClick} className={`group flex flex-col items-center select-none ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="h-3.5 flex items-center justify-center">
        {unit.star === 3 && (
          <span className="text-[11px] leading-none text-[#fbbf24] font-black tracking-tighter drop-shadow">★★★</span>
        )}
      </div>

      <div className="relative">
        <div className={`relative ${sizeDims[size] || sizeDims.md} rounded-[4px] border-[2px] ${costBorders[cost] || costBorders[3]} bg-[#14171f] overflow-hidden shadow-md`}>
          <img
            src={currentImgUrl}
            alt={unit.name || unit.key}
            onError={() => {
              if (fallbackStep < candidateUrls.length - 1) setFallbackStep(prev => prev + 1);
            }}
            className="w-full h-full object-cover object-center"
          />
        </div>

        {unit.items && unit.items.length > 0 && (
          <div className="absolute -bottom-1.5 inset-x-0 flex items-center justify-center gap-[1px] z-10">
            {unit.items.slice(0, 3).map((itemId, idx) => {
              const itemObj = ITEMS_CATALOG[itemId];
              return itemObj ? (
                <img
                  key={idx}
                  src={itemObj.icon}
                  alt={itemObj.name}
                  title={itemObj.name}
                  className="w-4 h-4 rounded-[2px] border border-black/90 bg-slate-950 shadow"
                />
              ) : null;
            })}
          </div>
        )}
      </div>

      {showName && (
        <span className="mt-2 text-[10px] text-[#c8cdd6] font-medium leading-none truncate max-w-[56px] text-center">
          {unit.name || unit.key}
        </span>
      )}
    </div>
  );
};

const HoneycombBoard4x7 = ({ units = [], dynamicChampMap, interactive = false, onCellClick }) => {
  const unitPosMap = useMemo(() => {
    const map = new Map();
    units.forEach(u => {
      if (u.row !== undefined && u.col !== undefined) map.set(`${u.row}-${u.col}`, u);
    });
    return map;
  }, [units]);

  const costHexColors = {
    1: 'bg-[#788292]',
    2: 'bg-[#11b288]',
    3: 'bg-[#207ac7]',
    4: 'bg-[#c440da]',
    5: 'bg-[#ffb93b]'
  };

  return (
    <div className="bg-[#111318] border border-white/10 rounded-lg p-3 select-none">
      <div className="text-[11px] font-bold text-gray-400 mb-2 flex items-center justify-between">
        <span>Sơ đồ xếp bài chuẩn (4x7 Board Positioning)</span>
        <span className="text-[10px] text-amber-400">Hàng trên: Chống chịu • Hàng dưới: Chủ lực</span>
      </div>
      <div className="flex flex-col gap-1.5 items-center py-1">
        {[0, 1, 2, 3].map(row => (
          <div key={row} className={`flex items-center gap-1.5 ${row % 2 === 1 ? 'ml-6 sm:ml-7' : ''}`}>
            {[0, 1, 2, 3, 4, 5, 6].map(col => {
              const cellUnit = unitPosMap.get(`${row}-${col}`);
              const cleanKey = cellUnit ? (cellUnit.key || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
              const imgUrl = cellUnit
                ? (dynamicChampMap?.[cleanKey]?.iconUrl || `https://cdn.metatft.com/file/metatft/champions/da_18_${cleanKey}.png`)
                : '';

              return (
                <div
                  key={col}
                  onClick={() => interactive && onCellClick && onCellClick(row, col, cellUnit)}
                  className={`relative flex flex-col items-center ${interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                >
                  <div
                    style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)' }}
                    className={`w-10 h-11 sm:w-11 sm:h-12 p-[2px] flex items-center justify-center ${cellUnit ? costHexColors[cellUnit.cost] || 'bg-amber-400' : 'bg-[#222530] hover:bg-[#2d3240]'}`}
                  >
                    <div
                      style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)' }}
                      className="w-full h-full bg-[#171a22] overflow-hidden flex items-center justify-center"
                    >
                      {cellUnit ? (
                        <img
                          src={imgUrl}
                          alt={cellUnit.name}
                          onError={(e) => {
                            e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${cellUnit.key}.png`;
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[8px] text-white/15 font-bold">{row + 1}-{col + 1}</span>
                      )}
                    </div>
                  </div>
                  {cellUnit && (
                    <span className="text-[9px] text-white font-bold mt-0.5 truncate max-w-[44px]">{cellUnit.name || cellUnit.key}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const TraitBadge = ({ trait, dynamicTraitMap }) => {
  const [iconErr, setIconErr] = useState(false);
  const cleanTrait = trait.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const traitIconUrl = dynamicTraitMap?.[cleanTrait]?.iconUrl || `https://cdn.metatft.com/file/metatft/traits/${cleanTrait}.png`;

  const styles = {
    gold: 'bg-[#332714] border-[#c7912c] text-[#f5d17f]',
    silver: 'bg-[#232730] border-[#8b9bb4] text-[#d8e1ef]',
    bronze: 'bg-[#281d17] border-[#965d37] text-[#dfa885]'
  };

  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-bold ${styles[trait.style] || styles.bronze}`}>
      {!iconErr ? (
        <img src={traitIconUrl} alt={trait.name} onError={() => setIconErr(true)} className="w-3.5 h-3.5 object-contain brightness-125" />
      ) : (
        <span className="text-[9px]">◆</span>
      )}
      <span>{trait.count}</span>
    </div>
  );
};

// ============================================================================
// 5. COMPONENT CHÍNH (CÓ NÚT COPY NHANH, NÚT MỞ RỘNG & TEAM BUILDER)
// ============================================================================
function MetaTFTApp() {
  const [activeNav, setActiveNav] = useState('comps');
  const [expandedCompId, setExpandedCompId] = useState('vanguard-morgana');
  const [copiedCompId, setCopiedCompId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSetNumber, setCurrentSetNumber] = useState(18);
  const [currentSetName, setCurrentSetName] = useState('Enchanted Wilds');
  const [dynamicChampMap, setDynamicChampMap] = useState({});
  const [dynamicTraitMap, setDynamicTraitMap] = useState({});
  const [compsList] = useState(FALLBACK_SET18_COMPS);
  const [syncStatus, setSyncStatus] = useState('Đang đồng bộ CDragon & MetaTFT...');
  const [toast, setToast] = useState(null);

  // State cho Team Builder
  const [builderUnits, setBuilderUnits] = useState(FALLBACK_SET18_COMPS[0].units);
  const [selectedBuilderChamp, setSelectedBuilderChamp] = useState(CHAMPIONS_HEX_ROSTER[0]);
  const [importCodeInput, setImportCodeInput] = useState('');

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const handleCopyTeamCode = (comp, e) => {
    if (e) e.stopPropagation();
    const code = encodeTeamPlannerCode(comp.units, comp.setTag || 'TFTSet18');
    navigator.clipboard?.writeText(code);
    setCopiedCompId(comp.id);
    triggerToast(`Đã copy mã "${comp.name}": ${code} (Dán thẳng vào ĐTCL!)`);
    setTimeout(() => setCopiedCompId(null), 2000);
  };

  const handleOpenInBuilder = (comp, e) => {
    if (e) e.stopPropagation();
    setBuilderUnits(comp.units.map(u => ({ ...u, items: [...(u.items || [])] })));
    setActiveNav('builder');
    triggerToast(`Đã nạp đội hình "${comp.name}" vào Team Builder!`);
  };

  const handleBuilderCellClick = (row, col, existingUnit) => {
    if (existingUnit) {
      setBuilderUnits(prev => prev.filter(u => !(u.row === row && u.col === col)));
    } else {
      if (builderUnits.length >= 10) return triggerToast('Tối đa 10 tướng trên bàn cờ!');
      setBuilderUnits(prev => [
        ...prev,
        {
          key: selectedBuilderChamp.key,
          name: selectedBuilderChamp.name,
          cost: selectedBuilderChamp.cost,
          star: 2,
          row,
          col,
          items: []
        }
      ]);
    }
  };

  const syncLatestSeasonData = async () => {
    try {
      const res = await fetch(CDRAGON_TFT_JSON);
      if (res.ok) {
        const data = await res.json();
        const setsObj = data.sets || {};
        const setNumbers = Object.keys(setsObj).map(Number).filter(n => !isNaN(n));
        const maxSet = Math.max(...setNumbers);
        const latestSetData = setsObj[String(maxSet)];

        if (latestSetData) {
          setCurrentSetNumber(maxSet);
          setCurrentSetName(latestSetData.name || `Set ${maxSet}`);

          const cMap = {};
          (latestSetData.champions || []).forEach(ch => {
            if (!ch.name) return;
            const cleanName = ch.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const apiClean = (ch.apiName || '').replace(/^.*_/, '').toLowerCase();
            const iconUrl = resolveCDragonAssetUrl(ch.tileIcon || ch.squareIcon || ch.icon);
            const entry = { name: ch.name, apiName: ch.apiName, cost: ch.cost || 1, iconUrl };
            cMap[cleanName] = entry;
            if (apiClean) cMap[apiClean] = entry;
          });
          setDynamicChampMap(cMap);

          const tMap = {};
          (latestSetData.traits || []).forEach(tr => {
            if (!tr.name) return;
            const cleanTr = tr.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            tMap[cleanTr] = { name: tr.name, iconUrl: resolveCDragonAssetUrl(tr.icon) };
          });
          setDynamicTraitMap(tMap);
          setSyncStatus(`Đã đồng bộ Mùa ${maxSet} (Tướng, Trang bị & Lõi Nâng Cấp)`);
        }
      }
    } catch (_) {
      setSyncStatus('Đang dùng CDN trực tiếp của MetaTFT Set 18');
    }
  };

  useEffect(() => {
    syncLatestSeasonData();
  }, []);

  const playstyleBadgeColor = (style) => {
    if (style.toLowerCase().includes('fast')) return 'bg-[#1b2c3b] text-[#5bc0de] border-[#31708f]';
    return 'bg-[#2e2618] text-[#e5a93c] border-[#8a6d3b]';
  };

  const difficultyBadgeColor = (diff) => {
    if (diff === 'Easy') return 'bg-[#192e22] text-[#4cae4c] border-[#2b542c]';
    if (diff === 'Medium') return 'bg-[#2e2618] text-[#f0ad4e] border-[#8a6d3b]';
    return 'bg-[#331c1e] text-[#d9534f] border-[#761c19]';
  };

  const builderPlannerCode = useMemo(() => encodeTeamPlannerCode(builderUnits, 'TFTSet18'), [builderUnits]);

  return (
    <div className="min-h-screen bg-[#141518] text-[#e6e6e6] flex flex-col font-sans">
      {/* TOAST THÔNG BÁO KHI COPY MÃ */}
      {toast && (
        <div className="fixed top-16 right-5 z-50 bg-[#1e222d] border-2 border-[#e5a93c] text-white px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#e5a93c] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-[#1b1c21] border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-[1340px] mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-lg text-white">MetaTFT</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-[#f3c45a] border border-amber-500/30">
              SET {currentSetNumber}: {currentSetName.toUpperCase()}
            </span>
            <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              <Radio className="w-3 h-3 animate-pulse" />
              {syncStatus}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: 'comps', label: 'Tier List & Lõi Gợi Ý' },
              { id: 'builder', label: 'Team Builder (Tạo Mã)' },
              { id: 'augments', label: 'Bảng Xếp Hạng Lõi' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveNav(tab.id)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  activeNav === tab.id ? 'bg-[#e5a93c] text-black' : 'bg-[#252834] text-gray-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1340px] w-full mx-auto px-4 py-5 flex-1 space-y-3">
        {/* TAB 1: DANH SÁCH ĐỘI HÌNH META */}
        {activeNav === 'comps' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-white">Meta Team Comps Tier List</h1>
                <p className="text-xs text-gray-400">
                  Bấm nút <strong className="text-[#f3c45a]">Copy Mã</strong> để dán thẳng vào Team Planner trong ĐTCL, hoặc bấm <strong className="text-white">Chi tiết ▾</strong> để mở Bàn cờ 4x7 & Lõi nâng cấp.
                </p>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm đội hình, tướng..."
                className="bg-[#1c1d22] border border-white/10 rounded px-3 py-1.5 text-xs text-white outline-none w-60"
              />
            </div>

            <div className="space-y-3">
              {compsList
                .filter(c =>
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.units.some(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map(comp => {
                  const isExpanded = expandedCompId === comp.id;
                  const isCopied = copiedCompId === comp.id;
                  const teamCode = encodeTeamPlannerCode(comp.units, comp.setTag);

                  const tierColors = {
                    S: 'bg-[#ff6b6b] text-[#141518]',
                    A: 'bg-[#feca57] text-[#141518]',
                    B: 'bg-[#48dbfb] text-[#141518]'
                  };

                  return (
                    <div key={comp.id} className="bg-[#1c1d22] border border-white/10 rounded-md overflow-hidden hover:border-white/25 transition-all">
                      {/* HÀNG TÓM TẮT ĐỘI HÌNH */}
                      <div
                        onClick={() => setExpandedCompId(isExpanded ? null : comp.id)}
                        className="p-3 sm:px-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer"
                      >
                        {/* Cột 1: Tên & Lối chơi */}
                        <div className="flex items-center gap-3 lg:w-[210px] shrink-0">
                          <div className={`w-7 h-7 rounded-[4px] flex items-center justify-center font-black text-sm ${tierColors[comp.tier] || tierColors.S}`}>
                            {comp.tier}
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-white leading-tight">{comp.name}</div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${playstyleBadgeColor(comp.playstyle)}`}>
                                {comp.playstyle}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${difficultyBadgeColor(comp.difficulty)}`}>
                                {comp.difficulty}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Cột 2: Tộc Hệ + Tướng + Lõi Gợi Ý Nhanh */}
                        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-1">
                            {comp.traits.map((tr, idx) => (
                              <TraitBadge key={idx} trait={tr} dynamicTraitMap={dynamicTraitMap} />
                            ))}
                          </div>

                          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                            {comp.units.map((u, idx) => (
                              <ChampionPortraitTile key={idx} unit={u} dynamicChampMap={dynamicChampMap} />
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 mr-1">
                              <Sparkles className="w-3 h-3" /> Lõi chuẩn:
                            </span>
                            {(comp.augments || []).map((augId, i) => (
                              <AugmentBadge key={i} augId={augId} compact={true} />
                            ))}
                          </div>
                        </div>

                        {/* Cột 3: Thống kê + Cụm Nút Copy Nhanh & Nút Mở Rộng Chi Tiết */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-2.5 lg:w-[340px] shrink-0 border-t lg:border-t-0 border-white/5 pt-2.5 lg:pt-0">
                          {/* Cụm nút chức năng nhanh ở góc trên bên phải giống MetaTFT */}
                          <div className="flex items-center gap-1.5 self-end">
                            <button
                              onClick={(e) => handleCopyTeamCode(comp, e)}
                              title="Copy mã Team Planner dán thẳng vào game"
                              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-extrabold border transition-all ${
                                isCopied
                                  ? 'bg-emerald-500 text-black border-emerald-400'
                                  : 'bg-[#262936] hover:bg-[#e5a93c] text-amber-300 hover:text-black border-amber-500/40'
                              }`}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isCopied ? 'Đã Copy!' : 'Copy Mã'}</span>
                            </button>

                            <button
                              onClick={(e) => handleOpenInBuilder(comp, e)}
                              title="Mở trong Team Builder để chỉnh sửa"
                              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-[#262936] hover:bg-blue-600 text-gray-200 hover:text-white border border-white/10 transition-colors"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Sửa Bài</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCompId(isExpanded ? null : comp.id);
                              }}
                              title="Mở rộng xem bàn cờ & chi tiết đội hình"
                              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                                isExpanded
                                  ? 'bg-white/15 text-white border-white/30'
                                  : 'bg-[#262936] hover:bg-white/10 text-gray-300 border-white/10'
                              }`}
                            >
                              <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* 4 chỉ số thống kê */}
                          <div className="grid grid-cols-4 gap-3 text-center tabular-nums w-full">
                            <div>
                              <div className="text-sm font-extrabold text-[#4cd137]">{comp.avgPlace.toFixed(2)}</div>
                              <div className="text-[10px] text-gray-400">Avg Place</div>
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-white">{comp.pickRate.toFixed(2)}</div>
                              <div className="text-[10px] text-gray-400">Pick Rate</div>
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-[#e17055]">{comp.winRate.toFixed(1)}%</div>
                              <div className="text-[10px] text-gray-400">Win Rate</div>
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-[#4cd137]">{comp.top4Rate.toFixed(1)}%</div>
                              <div className="text-[10px] text-gray-400">Top 4 Rate</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* KHUNG MỞ RỘNG CHI TIẾT ĐỘI HÌNH */}
                      {isExpanded && (
                        <div className="bg-[#15171e] border-t border-white/10 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                          {/* Cột trái: Bàn cờ 4x7 + Mã Team Planner */}
                          <div className="lg:col-span-7 space-y-3">
                            <HoneycombBoard4x7 units={comp.units} dynamicChampMap={dynamicChampMap} />

                            {/* Hộp Copy Mã Team Planner trực tiếp */}
                            <div className="bg-[#1c1e26] border border-amber-500/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] font-extrabold text-[#f3c45a] uppercase tracking-wider">
                                  Mã Đội Hình In-Game (Team Planner Code)
                                </div>
                                <div className="font-mono text-xs text-gray-300 truncate mt-0.5 select-all">
                                  {teamCode}
                                </div>
                              </div>
                              <button
                                onClick={(e) => handleCopyTeamCode(comp, e)}
                                className="px-3.5 py-2 rounded bg-[#e5a93c] hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Mã Dán Vào Game</span>
                              </button>
                            </div>
                          </div>

                          {/* Cột phải: Lõi Nâng Cấp Chi Tiết + Lộ Trình & Early Game */}
                          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                            <div className="bg-[#1c1e26] border border-white/10 rounded-lg p-3 space-y-2">
                              <div className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4" />
                                Lõi Nâng Cấp Tốt Nhất (Best Augments)
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {(comp.augments || []).map((augId, idx) => (
                                  <AugmentBadge key={idx} augId={augId} compact={false} />
                                ))}
                              </div>
                            </div>

                            <div className="bg-[#1c1e26] border border-white/10 rounded-lg p-3 space-y-2 text-xs">
                              <div>
                                <span className="text-gray-400 font-semibold">Tướng giữ đồ đầu trận (Early Game): </span>
                                <span className="text-cyan-300 font-bold">{(comp.earlyUnits || []).join(', ')}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 font-semibold">Lộ trình lên cấp: </span>
                                <span className="text-white font-bold">{comp.leveling}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 font-semibold">Ưu tiên đi chợ (Carousel): </span>
                                <span className="text-amber-300 font-bold">{comp.carousel}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </>
        )}

        {/* TAB 2: TEAM BUILDER (XẾP BÀN CỜ & TẠO/NHẬP MÃ TEAM PLANNER) */}
        {activeNav === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 space-y-3">
              <div className="bg-[#1c1d22] border border-white/10 p-3 rounded-lg flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold">
                  Đang chọn tướng để đặt lên bàn cờ: <strong className="text-[#f3c45a]">{selectedBuilderChamp.name}</strong> ({builderUnits.length}/10 tướng)
                </span>
                <button
                  onClick={() => setBuilderUnits([])}
                  className="px-2.5 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 font-bold flex items-center gap-1 hover:bg-rose-500/25"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa Bàn Cờ
                </button>
              </div>

              <HoneycombBoard4x7
                units={builderUnits}
                dynamicChampMap={dynamicChampMap}
                interactive={true}
                onCellClick={handleBuilderCellClick}
              />

              {/* Xuất & Nhập Mã Team Planner */}
              <div className="bg-[#1c1d22] border border-white/10 p-3 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs text-amber-300 bg-[#121318] px-3 py-1.5 rounded border border-white/10 flex-1 truncate">
                    {builderPlannerCode}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(builderPlannerCode);
                      triggerToast(`Đã copy mã bàn cờ: ${builderPlannerCode}`);
                    }}
                    className="px-3.5 py-1.5 rounded bg-[#e5a93c] text-black font-extrabold text-xs flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Mã Này
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importCodeInput}
                    onChange={e => setImportCodeInput(e.target.value)}
                    placeholder="Dán mã 01...TFTSet18 từ game vào đây để nạp lên bàn cờ"
                    className="flex-1 bg-[#121318] border border-white/10 rounded px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <button
                    onClick={() => {
                      const res = decodeTeamPlannerCode(importCodeInput);
                      if (res?.units?.length) {
                        setBuilderUnits(res.units);
                        triggerToast(`Đã nạp ${res.units.length} tướng từ mã Team Planner!`);
                      } else {
                        triggerToast('Mã không hợp lệ!');
                      }
                    }}
                    className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white"
                  >
                    Import Mã
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#1c1d22] border border-white/10 p-3.5 rounded-lg">
              <div className="text-xs font-extrabold text-white mb-2.5">Chọn Tướng Đặt Lên Bàn Cờ</div>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-[460px] overflow-y-auto pr-1">
                {CHAMPIONS_HEX_ROSTER.map(ch => (
                  <div
                    key={ch.key}
                    onClick={() => setSelectedBuilderChamp(ch)}
                    className={`p-1 rounded border cursor-pointer transition-all ${
                      selectedBuilderChamp.key === ch.key ? 'border-[#e5a93c] bg-amber-500/15 scale-105' : 'border-transparent hover:bg-white/5'
                    }`}
                  >
                    <ChampionPortraitTile unit={ch} dynamicChampMap={dynamicChampMap} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BẢNG XẾP HẠNG LÕI NÂNG CẤP */}
        {activeNav === 'augments' && (
          <div className="space-y-3">
            <h2 className="text-lg font-extrabold text-white">Bảng Xếp Hạng Lõi Nâng Cấp Mùa {currentSetNumber} (Augments Tier List)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.keys(AUGMENTS_CATALOG).map(augKey => (
                <AugmentBadge key={augKey} augId={augKey} compact={false} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MetaTFTApp />
  </React.StrictMode>
);
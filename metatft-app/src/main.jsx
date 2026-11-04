import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Search, Wrench, ChevronDown, ChevronUp, Copy, Check,
  Trash2, CheckCircle2, Sparkles
} from 'lucide-react';

const CDRAGON_BASE = 'https://raw.communitydragon.org/latest/cdragon/tft';
const CDRAGON_TFT_EN = `${CDRAGON_BASE}/en_us.json`;
const CDRAGON_TFT_VI = `${CDRAGON_BASE}/vi_vn.json`; // bản tiếng Việt -> khớp tên VN
const SET_NO = 18;

function resolveCDragonAssetUrl(texPath) {
  if (!texPath) return '';
  const cleaned = texPath.toLowerCase().replace(/\.(tex|dds)$/, '.png');
  return `https://raw.communitydragon.org/latest/game/${cleaned}`;
}
const normAugName = (str) =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
const stripSetPrefix = (api) => (api || '').replace(/^TFT\d*_/i, '').toLowerCase();

function indexCDragon(data, out) {
  if (!data) return;
  (Array.isArray(data.items) ? data.items : []).forEach((it) => {
    const api = it?.apiName || '';
    const icon = it?.icon || '';
    const isAug = /augment/i.test(api) || /\/augments?\//i.test(icon);
    if (!isAug || !icon || /missing-t\d/i.test(icon)) return;
    const url = resolveCDragonAssetUrl(icon);
    out.aug.byApi[api.toLowerCase()] = url;
    const n = normAugName(it.name);
    if (n && !out.aug.byName[n]) out.aug.byName[n] = url;
  });
  const set = data.sets?.[String(SET_NO)] || (Array.isArray(data.setData) ? data.setData.find((x) => x.number === SET_NO) : null);
  (set?.champions || []).forEach((c) => {
    const icon = c.squareIcon || c.tileIcon || c.icon;
    const k = stripSetPrefix(c.apiName);
    if (icon && k && !out.champ[k]) out.champ[k] = { iconUrl: resolveCDragonAssetUrl(icon), cost: c.cost };
  });
  (set?.traits || []).forEach((t) => {
    const k = normAugName(t.name);
    if (t.icon && k && !out.trait[k]) out.trait[k] = { iconUrl: resolveCDragonAssetUrl(t.icon) };
  });
}

let cdragonPromise = null;
function loadCDragon() {
  if (cdragonPromise) return cdragonPromise;
  const get = (u) => fetch(u).then((r) => r.json()).catch(() => null);
  cdragonPromise = Promise.all([get(CDRAGON_TFT_VI), get(CDRAGON_TFT_EN)]).then(([vi, en]) => {
    const out = { aug: { byName: {}, byApi: {} }, champ: {}, trait: {} };
    indexCDragon(vi, out); // VN trước để tên Việt được ưu tiên
    indexCDragon(en, out);
    return out;
  });
  return cdragonPromise;
}

function useAugmentIndex() {
  const [index, setIndex] = useState(null);
  useEffect(() => {
    let alive = true;
    loadCDragon().then((o) => alive && setIndex(o.aug));
    return () => { alive = false; };
  }, []);
  return index;
}

const slugMetaTFT = (name) =>
  (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

function metaTFTCandidates(aug) {
  const list = [];
  if (aug.metaIcon) list.push(aug.metaIcon); // URL thật scrape từ metatft.gg/augments
  const slug = slugMetaTFT(aug.name);
  if (slug) {
    ['2026/08', '2026/09', '2026/10', '2026/07', '2026/11'].forEach((m) =>
      list.push(`https://metatft.gg/wp-content/uploads/${m}/${slug}.png`)
    );
  }
  return list;
}

function pickAugmentIcon(aug, index) {
  if (aug.iconOverride) return aug.iconOverride;
  if (!index || /\+$/.test(aug.name || '')) return '';
  const api = (aug.apiName || '').toLowerCase();
  if (api && index.byApi[api]) return index.byApi[api];
  for (const k of [aug.en, aug.name].filter(Boolean).map(normAugName)) {
    if (index.byName[k]) return index.byName[k];
  }
  return ''; // CDragon không có -> AugmentBadge sẽ rơi xuống metaTFTCandidates()
}

const MT_UP = 'https://metatft.gg/wp-content/uploads/';
const OPGG_IMG = 'https://c-tft-api.op.gg/img/set/18/tft-champion/tiles/';
const OPGG_NAME = { NguoiDa: 'AncientSentinel', ElderDragon: 'TheElderDragon', Brambleback: 'Brambleback', Krug: 'Krug', Pebbles: 'Pebbles', Murkwolf: 'Murkwolf', CuaKyCuc: 'Scuttlecrab', CocThanhTinh: 'Gromp', MamNon: 'Cinderling', ChimMe: 'Raptor' };
const OPGG_TRAIT = { Blackthorn: 'OldGod', Thornmaiden: 'ZyraOrigin' };
// [key, tên hiển thị (VN nếu có), giá, tộc/hệ, kiểu ảnh a|b|c|đường dẫn, tên file nếu khác key]
const CHAMP_SPEC = [
  ['Tristana','Tristana',3,'Tiên Linh,Tinh Nghịch,Thợ Săn','a'],['Ivern','Ivern',5,'Thụ Thần','a'],
  ['Alune','Alune',5,'Hòa Hợp,Mặt Trăng,Thuật Sư','a'],['Zyra','Zyra',4,'Vườn Gai,Triệu Hồi','a'],
  ['Soraka','Soraka',4,'Thực Vật,Đao Phủ','a'],['Sivir','Sivir',4,'Nguyên Sinh,Thợ Săn','a'],
  ['Malphite','Malphite',4,'Gai Đen,Cự Thạch','a'],['Lillia','Lillia',4,'Tiên Linh,Vệ Quân','a'],
  ['Amumu','Amumu',4,'Hỏa Ngục,Dũng Sĩ','a'],['Rengar','Rengar',3,'Khắc Tinh','a'],
  ['Krug','Quái Đá Krug',3,'Quái Rừng,Đấu Sĩ','a'],['KhaZix',"Kha'Zix",3,'Khắc Tinh','a'],
  ['Hecarim','Hecarim',3,'Thần Rừng,Tiên Phong','a'],['Cassiopeia','Cassiopeia',3,'Tiên Hắc Ám,Thuật Sư','a'],
  ['Kayle','Kayle',2,'Mặt Trời,Liên Kích','c'],['Elise','Elise',2,'Tiên Hắc Ám,Tiên Phong','c'],
  ['Alistar','Alistar',2,'Thần Rừng,Đấu Sĩ','c'],['Varus','Varus',1,'Hỏa Ngục,Liên Kích','b'],
  ['Rakan','Rakan',1,'Tiên Linh,Dũng Sĩ,Tiên Phong','b'],['Kobuko','Kobuko',1,'Tinh Nghịch,Đấu Sĩ','b'],
  ['MamNon','Mầm Non',1,'Quái Rừng,Thợ Săn','2026/07/Mam-non-_tft_set_18.jpg'],
  ['Camille','Camille',1,'Tiên Hắc Ám,Tàn Phá','b'],['Morgana','Morgana',4,'Tiên Hắc Ám,Thuật Sĩ','a'],
  ['MasterYi','Master Yi',3,'Hoa Linh,Thích Ứng','a'],['Rammus','Rammus',3,'Tinh Nghịch,Vệ Quân','a'],
  ['Karma','Karma',1,'Hoa Linh,Thuật Sư','b'],['Xayah','Xayah',1,'Thần Rừng,Tiên Linh,Liên Kích','b'],
  ['Maokai','Maokai',5,'Cổ Thụ,Dũng Sĩ','a'],['Gnar','Gnar',5,'Thần Rừng,Tinh Nghịch,Đấu Sĩ','a'],
  ['Akali','Akali',1,'Thích Ứng,Hỏa Ngục,Tàn Phá','b'],['Ezreal','Ezreal',4,'Thần Rừng,Đao Phủ','a'],
  ['LuxMatTroi','Lux (Mặt Trời)',5,'Thế Thần,Mặt Trời','2026/08/Lux-Mat-Troi-tft-18.avif'],
  ['LuxNguyenSinh','Lux (Nguyên Sinh)',5,'Thế Thần,Nguyên Sinh','2026/08/Lux-Nguyen-Sinh-tft-18.avif'],
  ['LuxMatTrang','Lux (Mặt Trăng)',5,'Thế Thần,Mặt Trăng','2026/08/Lux-Mat-Trang.avif'],
  ['LuxHoaNguc','Lux (Hỏa Ngục)',5,'Thế Thần,Hỏa Ngục','2026/08/Lux-Hoa-Nguc.avif'],
  ['LuxTienLinh','Lux (Tiên Linh)',5,'Thế Thần,Tiên Linh','2026/08/Lux-Tien-Linh-tft-18.avif'],
  ['LuxThanRung','Lux (Thần Rừng)',5,'Thế Thần,Thần Rừng','2026/08/Lux-Than-Rung-tft-18.avif'],
  ['LuxTienHacAm','Lux (Tiên Hắc Ám)',5,'Thế Thần,Tiên Hắc Ám','2026/08/Lux-Tien-Hac-Am-tft-18.avif'],
  ['LuxHoaLinh','Lux (Hoa Linh)',5,'Thế Thần,Hoa Linh','2026/08/Lux-Hoa-Linh-tft-18.avif'],
  ['LuxGaiDen','Lux (Gai Đen)',5,'Thế Thần,Gai Đen','2026/08/Lux-Gai-Den-tft-18.avif'],
  ['ElderDragon','Rồng Ngàn Tuổi',5,'Bá Chủ,Quái Rừng','2025/12/rong_ngan_tuoi_tft_set_18.jpg'],
  ['NguoiDa','Người Đá',4,'Quái Rừng,Tiên Phong,Thuật Sĩ','2025/12/nguoi_da_tft_set_18.jpg'],
  ['Brambleback','Bụi Gai Đỏ',4,'Quái Rừng,Tàn Phá','2025/12/bui_gai_do_tft_set_18.jpg'],
  ['ChimMe','Chim Mẹ',3,'Quái Rừng,Triệu Hồi,Liên Kích','2025/12/chim_me_tft_set_18.jpg'],
  ['Murkwolf','Sói Hắc Ám',2,'Quái Rừng,Tàn Phá','2026/07/soi_hac_am_tft_set_18.jpg'],
  ['CocThanhTinh','Cóc Thành Tinh',2,'Quái Rừng,Thích Ứng','2026/07/coc_thanh_tinh_tft_set_18.jpg'],
  ['CuaKyCuc','Cua Kỳ Cục',2,'Quái Rừng,Dũng Sĩ','2026/07/cua_ky_cuc_tft_set_18.jpg'],
  ['Pebbles','Sỏi',1,'Quái Rừng,Thuật Sĩ','2026/07/soi__tft_set_18.webp'],
  ['Ornn','Ornn',1,'Thần Rừng,Vệ Quân','b'],['Azir','Azir',3,'Gai Đen,Đao Phủ,Triệu Hồi','a'],
  ['Fiddlesticks','Fiddlesticks',3,'Thực Vật,Vệ Quân,Thuật Sư','a'],['Sett','Sett',4,'Hoa Linh,Đấu Sĩ','a'],
  ['Taric','Taric',5,'Lục Bảo,Tiên Phong','a'],['Lux','Lux',5,'Thế Thần','a'],
  ['Veigar','Veigar',1,'Gai Đen,Tinh Nghịch,Thuật Sư','b'],['Warwick','Warwick',2,'Gai Đen,Tàn Phá','c'],
  ['Nidalee','Nidalee',4,'Nguyên Sinh,Thích Ứng','a'],['Diana','Diana',3,'Mặt Trăng,Tàn Phá,Tiên Phong','a'],
  ['Vi','Vi',3,'Nguyên Sinh,Dũng Sĩ','a'],['Yunara','Yunara',2,'Hoa Linh,Đao Phủ','c'],
  ['Draven','Draven',5,'Săn Thưởng','a'],['Leona','Leona',1,'Mặt Trời,Vệ Quân','b'],
  ['Ahri','Ahri',4,'Hoa Linh,Thuật Sư','a'],['Sejuani','Sejuani',2,'Mặt Trời,Dũng Sĩ','c'],
  ['Kennen','Kennen',5,'Hỏa Ngục,Đao Phủ','2025/12/Kennen_tft_set_18-1.jpg'],
  ['Leblanc','LeBlanc',2,'Thần Rừng,Thuật Sư','c','LeBlanc'],['Teemo','Teemo',2,'Tinh Nghịch,Thuật Sĩ','c'],
  ['Aphelios','Aphelios',4,'Mặt Trăng,Liên Kích','a'],['Ashe','Ashe',5,'Hoa Linh,Thợ Săn','a'],
  ['RekSai',"Rek'Sai",1,'Gai Đen,Đấu Sĩ','b'],['Yorick','Yorick',1,'Hoa Linh,Dũng Sĩ,Triệu Hồi','b'],
  ['Caitlyn','Caitlyn',2,'Tiên Hắc Ám,Thợ Săn','c'],['Shen','Shen',2,'Hỏa Ngục,Vệ Quân','c'],
  ['KogMaw',"Kog'Maw",3,'Ăn Mòn,Thích Ứng,Thuật Sĩ','a']
];
const CHAMPIONS_HEX_ROSTER = CHAMP_SPEC.map(([key, name, cost, traits, code, base], i) => {
  const b = base || key;
  const path = code === 'a' ? `2025/12/${b}_tft_set_18.jpg`
    : code === 'b' ? `2026/07/${b}__tft_set_18.jpg`
    : code === 'c' ? `2026/07/${b}_tft_set_18.jpg` : code;
  // LƯU Ý: hexCode chỉ là số thứ tự nội bộ, chưa đối chiếu với mã Team Planner thật của game
  return { key, name, cost, traits: traits.split(','), img: MT_UP + path, opgg: OPGG_IMG + (OPGG_NAME[key] ? OPGG_NAME[key] + '.jpg' : `tft18_${key.toLowerCase()}.tft_set18.jpg`), hexCode: (i + 1).toString(16).toUpperCase().padStart(2, '0') };
});

const CHAMP_BY_KEY = new Map(CHAMPIONS_HEX_ROSTER.map(c => [c.key.toLowerCase(), c]));
const CHAMP_BY_HEX = new Map(CHAMPIONS_HEX_ROSTER.map(c => [c.hexCode, c]));
// Sentinel (Blue Sentinel / bùa xanh, op.gg: AncientSentinel / DA_Sentinel18) = Người Đá trên MetaTFT (4 vàng, Quái Rừng/Tiên Phong/Thuật Sĩ). KHÔNG phải Malphite (Gai Đen/Cự Thạch).
const LEGACY_CHAMP = { sentinel: 'nguoida', bluesentinel: 'nguoida', ancientsentinel: 'nguoida', buaxanh: 'nguoida', dasentinel18: 'nguoida' };
const lookupChamp = (k) => CHAMP_BY_KEY.get(LEGACY_CHAMP[k] || k);
const champName = (k) => lookupChamp(String(k || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase())?.name || k;
const TRAIT_VI = { 'Apex Predator': 'Bá Chủ', 'Emerald Aspect': 'Lục Bảo', Riftbeast: 'Quái Rừng', Brawler: 'Đấu Sĩ', Invoker: 'Thuật Sĩ', Ravager: 'Tàn Phá', Vanguard: 'Tiên Phong', Greenfather: 'Thụ Thần', 'Old Growth': 'Cổ Thụ', 'Bounty Seeker': 'Săn Thưởng', Executioner: 'Đao Phủ', Inferno: 'Hỏa Ngục', Juggernaut: 'Dũng Sĩ', Elderwood: 'Thần Rừng', Solar: 'Mặt Trời', Summoner: 'Triệu Hồi', Spellweaver: 'Thuật Sư', Blossom: 'Hoa Linh', Sprykin: 'Tinh Nghịch', Attuned: 'Hòa Hợp', 'Flora Fatalis': 'Thực Vật', Lunar: 'Mặt Trăng', Defender: 'Vệ Quân', Fae: 'Tiên Linh', Thornmaiden: 'Vườn Gai', Blackthorn: 'Gai Đen', Coven: 'Tiên Hắc Ám', Rapidfire: 'Liên Kích', Rival: 'Khắc Tinh', Caustic: 'Ăn Mòn', Adaptor: 'Thích Ứng', Primal: 'Nguyên Sinh', Hunter: 'Thợ Săn', Monolith: 'Cự Thạch', Eclipse: 'Thiên Thực' };

function encodeTeamPlannerCode(units, setTag = 'TFTSet18') {
  const slots = [];
  for (let i = 0; i < 10; i++) {
    const u = units[i];
    if (u) {
      const cleanKey = (u.key || u.name || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const found = lookupChamp(cleanKey);
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

const AUGMENTS_CATALOG = {
  vanguard_crest: { id: 'vanguard_crest', name: 'Huy Hiệu Hộ Vệ', tier: 'Gold', avgPlace: 3.78, desc: 'Nhận 1 Ấn Hộ Vệ và 1 tướng Hộ Vệ.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/trait_crest_generic.tft_set11.png' },
  coven_crown: { id: 'coven_crown', name: 'Vương Miện Tiên Hắc Ám', tier: 'Prismatic', avgPlace: 3.62, desc: 'Nhận 1 Ấn Tiên Hắc Ám và 1 Morgana.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/trait_crown_generic.tft_set11.png' },
  invoker_crest: { id: 'invoker_crest', name: 'Huy Hiệu Thuật Sĩ', tier: 'Gold', avgPlace: 3.84, desc: 'Nhận 1 Ấn Thuật Sĩ.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/trait_crest_generic.tft_set11.png' },
  riftbeast_crown: { id: 'riftbeast_crown', name: 'Vương Miện Quái Vật', tier: 'Prismatic', avgPlace: 3.55, desc: 'Nhận 1 Ấn Quái Rừng và 1 Quái Đá Krug.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/trait_crown_generic.tft_set11.png' },
  lunar_crest: { id: 'lunar_crest', name: 'Huy Hiệu Nguyệt Tộc', tier: 'Gold', avgPlace: 3.89, desc: 'Nhận 1 Ấn Nguyệt Tộc.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/trait_crest_generic.tft_set11.png' },
  jeweled_lotus_2: { id: 'jeweled_lotus_2', name: 'Khảm Bảo Thạch II', tier: 'Gold', avgPlace: 3.85, desc: 'Kỹ năng chí mạng và +20% Tỉ lệ Chí mạng.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/jeweledlotus2.png' },
  jeweled_lotus_3: { id: 'jeweled_lotus_3', name: 'Khảm Bảo Thạch III', tier: 'Prismatic', avgPlace: 3.68, desc: 'Kỹ năng chí mạng và +45% Tỉ lệ Chí mạng.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/jeweledlotus3.png' },
  cybernetic_bulk_2: { id: 'cybernetic_bulk_2', name: 'Giáp Năng Lượng II', tier: 'Gold', avgPlace: 3.92, desc: 'Tướng mang trang bị nhận thêm Máu.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/cyberneticbulk2.png' },
  healing_orbs_2: { id: 'healing_orbs_2', name: 'Cầu Hồi Phục II', tier: 'Gold', avgPlace: 3.88, desc: 'Hồi máu cho đồng minh khi kẻ địch hạ gục.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/healingorbs2.png' },
  magic_wand: { id: 'magic_wand', name: 'Đũa Phép', tier: 'Gold', avgPlace: 3.94, desc: 'Nhận 1 Gậy Quá Khổ và SMPT.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/magicwand.png' },
  level_up: { id: 'level_up', name: 'Khuyến Mãi Kinh Nghiệm', tier: 'Prismatic', avgPlace: 3.71, desc: 'Nhận thêm XP khi mua kinh nghiệm.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/levelup.png' },
  prismatic_ticket: { id: 'prismatic_ticket', name: 'Vé Kim Cương', tier: 'Prismatic', avgPlace: 3.65, desc: 'Tỉ lệ nhận lượt đổi cửa hàng miễn phí.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/goldenticket3.png' },
  trade_sector: { id: 'trade_sector', name: 'Khu Giao Dịch', tier: 'Gold', avgPlace: 3.91, desc: 'Nhận 1 lượt đổi cửa hàng miễn phí mỗi vòng.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/tradesector.png' },
  patient_study: { id: 'patient_study', name: 'Học Hỏi Kiên Nhẫn', tier: 'Gold', avgPlace: 3.86, desc: 'Nhận thêm XP sau mỗi giao tranh.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/patientstudy.png' },
  pandoras_items: { id: 'pandoras_items', name: "Hộp Pandora", tier: 'Silver', avgPlace: 3.98, desc: 'Trang bị hàng chờ biến đổi ngẫu nhiên.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/pandorasitems1.png' },
  component_buffet: { id: 'component_buffet', name: 'Tiệc Trang Bị', tier: 'Silver', avgPlace: 3.95, desc: 'Nhận thêm thành phần trang bị.', icon: 'https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/augments/choiceui/componentbuffet1.png' },
  blue_battery: { id: 'blue_battery', name: 'Pin Xanh Dương', tier: 'Silver', avgPlace: 3.93, desc: 'Tướng nhận thêm năng lượng khởi đầu.', icon: '' }
};
const AUGMENT_EN_NAMES = {
  vanguard_crest: 'Vanguard Crest',
  coven_crown: 'Coven Crown',
  invoker_crest: 'Invoker Crest',
  riftbeast_crown: 'Riftbeast Crown',
  lunar_crest: 'Lunar Crest',
  jeweled_lotus_2: 'Jeweled Lotus II',
  jeweled_lotus_3: 'Jeweled Lotus III',
  cybernetic_bulk_2: 'Cybernetic Bulk II',
  healing_orbs_2: 'Healing Orbs II',
  magic_wand: 'Magic Wand',
  level_up: 'Level Up',
  prismatic_ticket: 'Prismatic Ticket',
  trade_sector: 'Trade Sector',
  patient_study: 'Patient Study',
  pandoras_items: "Pandora's Items I",
  component_buffet: 'Component Buffet I',
  blue_battery: 'Blue Battery'
};
Object.keys(AUGMENTS_CATALOG).forEach((k) => {
  AUGMENTS_CATALOG[k].en = AUGMENT_EN_NAMES[k];
});
const MT = 'https://metatft.gg/wp-content/uploads/2026/08/';
const METATFT_AUGMENT_SYNC = {
  jeweled_lotus_2: { name: 'Khảm Bảo Thạch II', file: 'Kham-Bao-Thach-II.png', desc: 'Đội của bạn nhận 25% Tỉ Lệ Chí Mạng, 10% Sát Thương Chí Mạng và Chuẩn Xác.' },
  healing_orbs_2: { name: 'Cầu Hồi Phục II', file: 'Cau-Hoi-Phuc-II.png', desc: 'Khi 1 kẻ địch bị hạ gục, 1 đồng minh gần đó sẽ được hồi 575 Máu.' },
  level_up: { name: 'Thăng Cấp!', file: 'Thang-Cap.png', desc: 'Khi bạn mua XP, nhận thêm 2 XP. Ngay lập tức nhận 6 XP.' },
  prismatic_ticket: { name: 'Vé Kim Cương', file: 'Ve-Kim-Cuong.png', desc: 'Mỗi khi cửa hàng được đổi lại, bạn có 45% tỉ lệ nhận thêm 1 lượt đổi miễn phí.' },
  trade_sector: { name: 'Khu Giao Dịch', file: 'Khu-Giao-Dich.png', desc: 'Nhận 1 lượt đổi miễn phí mỗi vòng đấu. Nhận 2 vàng.' },
  patient_study: { name: 'Kiên Nhẫn Học Tập', file: 'Kien-Nhan-Hoc-Tap.png', desc: 'Sau giao tranh người chơi, nhận thêm 2 XP nếu thắng hoặc 3 XP nếu thua.' },
  pandoras_items: { name: 'Hộp Pandora I', file: 'Hop-Pandora-I.png', desc: 'Bắt đầu vòng đấu: trang bị trên hàng dự bị bị đánh tráo ngẫu nhiên. Nhận 1 trang bị thành phần ngẫu nhiên.' },
  component_buffet: { name: 'Đại Tiệc Trang Bị', file: 'Dai-Tiec-Trang-Bi.png', desc: 'Mỗi trang bị thành phần nhận được biến thành gói trang bị (4 lựa chọn). Nhận 1 trang bị thành phần ngẫu nhiên.' }
};
Object.entries(METATFT_AUGMENT_SYNC).forEach(([k, v]) => {
  const a = AUGMENTS_CATALOG[k];
  if (!a) return;
  a.name = v.name; a.desc = v.desc; a.metaIcon = MT + v.file;
});

const AUG_FILE_OVERRIDE = {
  'Chế Tạo Bằng Hữu': '2026/10/Che-Tao-Bang-Huu-e1792556707714.webp', 'Kiếm Tử Thần': '2026/10/Kiem-Tu-Than-tft-loi.png',
  'Kỳ Vọng Bất Ngờ': '2026/10/Ky-Vong-Bat-Ngo.png', 'Là Ta Đây': 'La-Ta-Day-1.png',
  'Sự Lựa Chọn của Mặt Trời': '2026/10/Su-Lua-Chon-cua-Mat-Troi.png', 'U.R.F': 'U.R.F.png',
  'Đầu Tư+': 'Dau-Tu.png', 'Đầu Tư++': 'Dau-Tu-1.png', 'Dư Âm Ma Thuật': 'Du-Am-Ma-Thuat.png',
  'Dư Âm Ma Thuật +': 'Du-Am-Ma-Thuat-.png', 'Dư Âm Ma Thuật ++': 'Du-Am-Ma-Thuat-1-1.png'
};
const AUGMENT_NAMES_VI = `Ân Huệ Thách Đấu;Ăn Mòn;Ăn Trộm;Arcane Viktor-y;Bài Học Sơ Khai;Bán Thăng Hoa;Băng Trộm;Băng Trộm II;Băng Trộm II+;Băng Trộm II++;Bảo Hộ Vô Tận;Báo Oán;Bão Vàng;Bừa Bộn;Bùng Cháy;Búp Bê Xây Tổ;Cắm Rễ Phân Tán;Cắm Rễ Phân Tán+;Cảm Thấy May Mắn;Cặp Đôi Hoàn Cảnh;Cầu Hồi Phục I;Cấy Ghép Siêu Công Nghệ;Cây Tộc/Hệ;Cây Tộc/Hệ+;Chế Tạo Bằng Hữu;Chế Tạo Tại Chỗ;Chỉ Một Con Đường;Chỉ Một Con Đường I;Chỉ Một Con Đường II;Chỉ Một Con Đường III;Chiến Thuật Đầu Tư I;Chiến Thuật Đầu Tư II;Chiết Xuất Trang Bị;Chờ Đợi Xứng Đáng;Chờ Đợi Xứng Đáng II;Chúc Phúc Của Bụt;Chuyện Đời Thường;Cố Gắng Lật Kèo;Cơn Khát Vàng;Cơn Khát Vàng+;Cộng Mệt Nghỉ!;Củng Cố Tuyến Trước;Cung Dự Phòng;Cuộc Viễn Chinh;Đặc Quyền Phú Gia;Đam Mê Đai Lưng;Đam Mê Gậy;Đam Mê Kiếm;Đầu Tư+;Đầu Tư++;Đẩy Nhanh Tiến Độ;Định Hướng Tương Lai;Đo Ni Đóng Giày;Đo Ni Đóng Giày+;Đồ Vương;Đội Hình Tối Ưu;Đòn Quyết Định;Động Cơ Tăng Tốc;Đồng Minh Của Bụt;Dòng Tiền Mờ Ám;Dư Âm Ma Thuật;Dư Âm Ma Thuật +;Dư Âm Ma Thuật ++;Được Cái Này Mất Cái Kia I;Đường Ra Trận;Ép Bốn;Gian Lận;Giáp Tự Chế I;Giáp Tự Chế II;Giọt Lệ Bi Ai;Giữ Vững Hàng Ngũ;Gói Đăng Ký Hạng Sang;Gói Tăng Cường;Gói Tăng Cường+;Gói Tăng Cường++;Gói Trang Bị Bất Ngờ;Gói Trang Bị Bất Ngờ+;Hạ Đo Ván;Hạ Đo Ván+;Hàng Chờ Đấu Đôi;Hàng Chờ Pandora;Hang Ổ Baron;Hào Quang Nhân Vật Chính;Hình Nhân Hóa;Hộp Pandora II;Hộp Pandora III;Huấn Luyện Cận Vệ;Hướng Đến Hồi Kết;Kề Vai Sát Cánh;Kết Nối Gián Đoạn;Khảm Bảo Thạch I;Khéo Tay Hay Làm;Khiên Đơn Đấu;Kho Báu Chôn Giấu III;Kho Báu Sắt;Kho Thần Tích;Khóa Dự Phòng;Khởi Động Nhanh;Không Đối Thủ;Khu Giao Dịch+;Kiếm Tử Thần;Kiên Nhẫn Là Một Đức Tính;Kim Long;Kỷ Nguyên;Kỷ Nguyên+;Kỳ Vọng Bất Ngờ;Là Ta Đây;Lấy Công Bù Thủ I;Lấy Công Bù Thủ II;Lệ Lưu Ly;Lên Ngôi Vương;Linh Hoạt;Linh Hồn Chuộc Tội;Linh Thú Vào Bếp;Lò Rèn Thần Thoại;Lò Rèn Tiềm Ẩn;Lông Xù Bé Nhỏ;Lựa Chọn Độc Quyền;Ma Thuật Đan Kết;Mặt Trời và Mặt Trăng;Mặt Trời và Mặt Trăng+;Mở Lối;Món Quà Ngọt Ngào;Một Bùa, Hai Bùa;Một, Hai, Ba;Một, Hai, Năm!;Mũ Tử Thần;Nâng Tầm Uy Lực;Người Bạn Vàng;Nhà Máy Tái Chế;Nhà Máy Tái Chế+;NHẮM MẮT CHƠI BỪA;Nhận 21 Vàng;Nhân Bản;Nhất Thống;Nhiệm Vụ Trang Bị;Nồi Nấu Ăn;Ôm Tập Thể I;Ôm Tập Thể II;Phân Nhánh;Phân Nhánh+;Phân Phối Tướng;Phân Phối Tướng+;Phân Phối Tướng++;Phình Đại;Phước Lành Vũ Trụ I;Phước Lành Vũ Trụ II;Phước Lành Vũ Trụ III;Quà Sinh Nhật;Quá Tải Tư Duy;Quà Tặng Thêm;Quà Tặng Thêm+;Quái Rừng Omega;Quái Thú Bên Trong;Quái Thú Bên Trong+;Quân Đoàn 3 Sao;Quang Lân Tiểu Yêu;Quay Trúng Thưởng;Quỹ Phòng Hộ;Rồng Đẻ Trứng Vàng;Sinh Nhật Đoàn Tụ;Sơ Đồ Tuyến Sau;Song Sát Tốc Hành;Song Vệ;Sống Vội;Sự Lựa Chọn của Mặt Trời;Tà Thuật;Tăng Trưởng Bùng Nổ;Tăng Trưởng Bùng Nổ+;Tăng Vốn I;Tăng Vốn II;Tập Chịu Đòn;Tập Trung Hỏa Lực;Tất Tay Bậc Đồng I;Tất Tay Bậc Đồng II;Thăng Hoa;Thăng Tiến Cuối Trận;Thệ Ước Bảo Hộ;Thép Mạ Vàng;Thích Mở Rộng;Thiên Nhiên Che Chở;Thợ Rèn Gậy;Thợ Rèn Kiếm;Thông Thoáng;Thứ Hạng Tộc Hệ;Thua Có Tính Toán;Thức Tỉnh Linh Hồn;Thực Vật Hấp Thụ;Thuế Nhận Thức;Thuế Nhận Thức+;Thương Vụ Khó Xơi;Tích Chuỗi Nhanh;Tiền Vệ Trung Tâm;Tiếng Gọi Hoa Nở;Tiếp Tế Trang Bị I;Tín Đồ Mua Sắm;Tín Đồ Tiên Hắc Ám;Tinh Linh Hoàn Tiền;Tinh Linh Hoàn Tiền+;Tinh Thông Mọi Tộc;Tinh Túy Kim Long;To Lớn & Mạnh Mẽ;Tòa Tháp;Tối Đa Hóa;Tôi Luyện Sức Mạnh;Tôi Thăng Cấp Một Mình;Trái Tim Sắt Đá;Trẻ, Khỏe & Tự Do;Trí Tuệ Siêu Công Nghệ;Triệu Gọi Hỗn Mang;Trung Tâm Thương Mại;Trượng Đại Thiên Sứ;Tụ Điện I;Tụ Điện II;Tự Lập Đội;Túi Đồ Cỡ Đại;Túi Đồ Cỡ Nhỏ;Túi Đồ Siêu Hùng;Túi Đồ Siêu Hùng+;Túi Đồ Siêu Hùng++;Túi Đồ Urf;U.R.F;Ván Cược Hoàng Kim;Ván Cược Hoàng Kim+;Ván Cược Hoàng Kim++;Vận Mệnh Bạc;Vận Mệnh Bạc+;Vận Mệnh Bạc++;Vận Mệnh Kim Cương;Vận Mệnh Kim Cương+;Vận Mệnh Vàng;Vận Mệnh Vàng+;Vay Tạm Ứng;Vay Tạm Ứng+;Vương Miện Hắc Hóa;Vượt Thời Gian;Xây Dựng Đội Hình;Xoay Bài Tự Động;Xúc Xắc Hoành Tráng;Xúc Xắc Ma Pháp;Xúc Xắc Vô Tận;Xứng Đáng Chờ Đợi`.split(';');
{
  const have = new Set(Object.values(AUGMENTS_CATALOG).map((a) => a.name));
  AUGMENT_NAMES_VI.forEach((name) => {
    if (have.has(name)) return;
    const plus = (name.match(/\++$/) || [''])[0].length;
    const f = AUG_FILE_OVERRIDE[name] || (slugMetaTFT(name.replace(/[+\s]+$/, '')) + (plus ? `-${plus}` : '') + '.png');
    const id = `aug_${normAugName(name)}${plus ? `_p${plus}` : ''}`;
    AUGMENTS_CATALOG[id] = { id, name, tier: '', desc: '', metaIcon: MT_UP + (f.includes('/') ? f : '2026/08/' + f) };
  });
}
const ITEM_SPEC = [
  // Trang bị thường (2026/01, .avif)
  'Áo Choàng Bóng Tối|Ao-Choang-Bong-Toi.avif','Áo Choàng Gai|Ao-Choang-Gai.avif','Áo Choàng Lửa|Ao-Choang-Lua.avif',
  'Áo Choàng Thủy Ngân|Ao-Choang-Thuy-Ngan.avif','Bàn Tay Công Lý|Ban-Tay-Cong-Ly.avif','Bùa Đỏ|Bua-Do.avif',
  'Bùa Xanh|Bua-Xanh.avif','Chùy Đoản Côn|Chuy-Doan-Con.avif','Cung Xanh|Cung-Xanh.avif',
  'Cuồng Đao Guinsoo|Cuong-Dao-Guinsoo.avif','Diệt Khổng Lồ|Diet-Khong-Lo.avif','Găng Bảo Thạch|Gang-Bao-Thach.avif',
  'Găng Đạo Tặc|Gang-Dao-Tac.avif','Giáp Máu Warmog|Giap-Mau-Warmog.avif','Giáp Tâm Linh|Giap-Tam-Linh.avif',
  'Giáp Vai Nguyệt Thần|Giap-Vai-Nguyet-Than.avif','Huyết Kiếm|Huyet-Kiem.avif','Kiếm Súng Hextech|Kiem-Sung-Hextech.avif',
  'Kiếm Tử Thần|Kiem-Tu-Than.avif','Lời Thề Hộ Vệ|Loi-The-Ho-Ve.avif','Móng Vuốt Sterak|Mong-Vuot-Sterak.avif',
  'Mũ Phù Thủy Rabadon|Mu-Phu-Thuy-Rabadon.avif','Mũ Thích Nghi|Mu-Thich-Nghi.avif','Nanh Nashor|Nanh-Nashor.avif',
  'Ngọn Giáo Shojin|Ngon-Giao-Shojin.avif','Nỏ Sét|No-Set.avif','Quỷ Thư Morello|Quy-Thu-Morello.avif',
  'Quyền Năng Khổng Lồ|Quyen-Nang-Khong-Lo.avif','Quyền Trượng Thiên Thần|Quyen-Truong-Thien-Than.avif',
  'Thịnh Nộ Thủy Quái|Thinh-No-Thuy-Quai.avif','Thú Tượng Thạch Giáp|Thu-Tuong-Thach-Giap.avif',
  'Trái Tim Kiên Định|Trai-Tim-Kien-Dinh.avif','Trượng Hư Vô|Truong-Hu-Vo.avif','Vô Cực Kiếm|Vo-Cuc-Kiem.avif',
  'Vương Miện Hoàng Gia|Vuong-Mien-Hoang-Gia.avif','Vuốt Rồng|Vuot-Rong.avif',
  // Trang bị Ấn (2026/08)
  'Ấn Đao Phủ|2026/08/An-Dao-Phu-tft-18-1.jpg','Ấn Đấu Sĩ|2026/08/An-Dau-Si-tft-18-1.jpg','Ấn Dũng Sĩ|2026/08/An-Dung-Si-tft-18.jpg',
  'Ấn Gai Đen|2026/08/An-Gai-Den-tft-18-1.jpg','Ấn Hoa Linh|2026/08/An-Hoa-Linh-tft-18.jpg','Ấn Hỏa Ngục|2026/08/An-Hoa-Nguc-tft-18-1.jpg',
  'Ấn Liên Kích|2026/08/An-Lien-Kich-tft-18-1.jpg','Ấn Mặt Trăng|2026/08/An-Mat-Trang-tft-18.jpg','Ấn Nguyên Sinh|2026/08/An-Nguyen-Sinh-tft-18-1.jpg',
  'Ấn Tàn Phá|2026/08/An-Tan-Pha-tft-18-1.jpg','Ấn Thần Rừng|2026/08/An-Than-Rung-tft-18-1.jpg','Ấn Thợ Săn|2026/08/An-Tho-San-tft-18.jpg',
  'Ấn Thuật Sĩ|2026/08/An-Thuat-Si-tft-18-1.jpg','Ấn Thuật Sư|2026/08/An-Thuat-Su-tft-18-1.jpg','Ấn Thực Vật|2026/08/An-Thuc-Vat-tft-18.jpg',
  'Ấn Tiên Hắc Ám|2026/08/An-Tien-Hac-Am-tft-18.jpg','Ấn Tiên Linh|2026/08/An-Tien-Linh-tft-18.jpg','Ấn Tiên Phong|2026/08/An-Tien-Phong-tft-18-1.jpg',
  'Ấn Tinh Nghịch|2026/08/An-Tinh-Nghich-tft-18.jpg','Ấn Vệ Quân|2026/08/An-Ve-Quan-tft-18.jpg',
  // Trang bị Tạo Tác
  'Bão Tố Luden|Bao-To-Luden.avif','Bất Khuất|Bat-Khuat.avif','Bùa Thăng Hoa|Bua-Thang-Hoa.avif','Chùy Bạch Ngân|Chuy-Bach-Ngan.avif',
  'Đá Hắc Hóa|Da-Hac-Hoa.avif','Đại Bác Hải Tặc|Dai-Bac-Hai-Tac.avif','Đại Bác Liên Thanh|Dai-Bac-Lien-Thanh.avif','Đao Chớp|Dao-Chop.avif',
  'Dao Điện Statikk|Dao-Dien-Statikk.avif','Đao Tím|Dao-Tim.avif','Dị Vật Tai Ương|2026/09/di-vat-tai-uong-tft.jpg','Găng Đấu Sĩ|Gang-Dau-Si.avif',
  'Găng Hư Không|Gang-Hu-Khong.avif','Giáp Đại Hãn|Giap-Dai-Han.avif','Giáp Tay Seeker|Giap-Tay-Seeker.avif',
  'Huy Hiệu Thánh Khiên|2026/08/Huy-Hieu-Thanh-Khien.avif','Khế Ước Vĩnh Hằng|Khe-Uoc-Vinh-Hang.avif','Khiên Hoàng Hôn|Khien-Hoang-Hon.avif',
  'Khiên Hừng Đông|Khien-Hung-Dong.avif','Kiếm Của Tay Bạc|Kiem-cua-Tay-Bac.avif','Kiếm Tai Ương|Kiem-Tai-Uong.avif',
  'Kính Nhắm Ma Pháp|Kinh-Nham-Ma-Phap.avif','Lõi Bình Minh|Loi-Binh-Minh.avif','Lưỡng Cực Zhonya|Luong-Cuc-Zhonya.avif','Pháo Xương Cá|Phao-Xuong-Ca.avif',
  'Rìu Đại Mãng Xà|Riu-Dai-Mang-Xa.avif','Rìu Hỏa Ngục|Riu-Hoa-Nguc.avif','Tam Luyện Kiếm|Tam-Luyen-Kiem.avif','Thánh Kiếm Manazane|Thanh-Kiem-Manazane.avif'
];
const ITEMS_CATALOG = {};
ITEM_SPEC.forEach((row) => {
  const [name, f] = row.split('|');
  const id = normAugName(name);
  ITEMS_CATALOG[id] = { id, name, icon: MT_UP + (f.includes('/') ? f : '2026/01/' + f) };
});
// id cũ trong dữ liệu đội hình -> trang bị Mùa 18 (vài mục là suy đoán, xem ghi chú)
const ITEM_ALIAS = {
  bluebuff: 'buaxanh', redbuff: 'buado', jeweled: 'gangbaothach', morello: 'quythumorello', warmog: 'giapmauwarmog',
  gargoyle: 'thutuongthachgiap', spirit: 'giaptamlinh', crownguard: 'vuongmienhoanggia', protector: 'loithehove',
  steadfast: 'traitimkiendinh', sunfire: 'aochoanglua', dclaw: 'vuotrong', eon: 'aochoangbongtoi', guinsoo: 'cuongdaoguinsoo',
  hoj: 'bantaycongly', ie: 'vocuckiem', lw: 'cungxanh', flail: 'chuydoancon', gs: 'dietkhonglo', kraken: 'thinhnothuyquai',
  deathblade: 'kiemtuthan', bt: 'huyetkiem', titans: 'quyennangkhonglo', sterak: 'mongvuotsterak', shojin: 'ngongiaoshojin',
  rabadon: 'muphuthuyrabadon', void: 'truonghuvo', archangel: 'quyentruongthienthan', nashor: 'nanhnashor',
  gunblade: 'kiemsunghextech', adaptive: 'muthichnghi', thief: 'gangdactac', qss: 'aochoangthuyngan',
  ionic: 'giapvainguyetthan', emblunar: 'anmattrang', embexec: 'andaophu', embbrawler: 'andausi', bramble: 'aochoanggai'
};

// ---------- Đội hình mẫu: TFT.OP.GG (Set 18, bản 18.6, mọi server, 86.488 ván/24h) ----------
const COMPS_SOURCE = 'TFT.OP.GG · bản 18.6 · mọi server · 86.488 ván/24 giờ (lấy 04/11/2026)';
const FRONT_KEYS = new Set(['alistar','amumu','krug','ornn','leona','shen','sejuani','rammus','malphite','nguoida','maokai','taric','warwick','kobuko','hecarim','vi','sett','brambleback','elise','camille','reksai','murkwolf','cuakycuc','cocthanhtinh','diana','fiddlesticks']);
const TANK_ITEMS = new Set(['gargoyle','spirit','warmog','crownguard','protector','steadfast','sunfire','adaptive','dclaw']);
// op.gg không cho ô đứng -> tự xếp: tướng chống chịu hàng trên, chủ lực hàng dưới (chỉ là gợi ý)
function autoPlace(units) {
  const isFront = (u) => FRONT_KEYS.has(u.key.toLowerCase()) || u.items.some((i) => TANK_ITEMS.has(i));
  const front = units.filter(isFront);
  const back = units.filter((u) => !isFront(u)).sort((a, b) => b.items.length - a.items.length);
  const cols = [3, 2, 4, 1, 5, 0, 6];
  const put = (arr, rows) => arr.forEach((u, i) => { u.row = rows[Math.floor(i / 7)] ?? rows[rows.length - 1]; u.col = cols[i % 7]; });
  put(front, [0, 1]); put(back, [3, 2]);
  return units;
}
// [id, hạng, tên, cấp, độ khó, avg, top1%, top4%, pick%, tộc/hệ (EN:số+g/s/b), tướng[trang bị]]
const COMP_DATA = [
  ['quai-rung-bui-gai-do','OP','Quái Rừng Bụi Gai Đỏ',8,'Hard',2.70,32.05,83.88,2.36,'Apex Predator:1g;Emerald Aspect:1g;Riftbeast:7g;Brawler:2b;Invoker:2b;Ravager:2b;Vanguard:2b','Pebbles;Murkwolf;Krug[gargoyle,spirit,warmog];Brambleback[eon,guinsoo,hoj];Sentinel[gargoyle,spirit,warmog];ElderDragon[ie,lw,flail];Gnar;Taric'],
  ['than-rung-ezreal','OP','Thần Rừng Ezreal',9,'Hard',3.04,32.89,74.74,2.12,'Greenfather:1g;Old Growth:1g;Bounty Seeker:1g;Emerald Aspect:1g;Brawler:2b;Executioner:2b;Inferno:2b;Juggernaut:2b;Elderwood:3b','Alistar;Amumu;Ezreal[deathblade,lw,shojin];Draven[deathblade,guinsoo,kraken];Gnar;Ivern;Kennen[eon,hoj,rabadon];Maokai[gargoyle,spirit,warmog];Taric'],
  ['quai-rung-maokai','OP','Quái Rừng Maokai',9,'Hard',3.21,31.48,72.00,1.80,'Apex Predator:1g;Greenfather:1g;Old Growth:1g;Bounty Seeker:1g;Emerald Aspect:1g;Inferno:2b;Juggernaut:2b;Vanguard:2b;Riftbeast:3b','Amumu;Sentinel;Draven[guinsoo,kraken,kraken];ElderDragon[ie,lw,flail];Ivern;Kennen[hoj,rabadon];Maokai[gargoyle,spirit,warmog];Taric'],
  ['mat-troi-yunara','OP','Mặt Trời Yunara',6,'Easy',2.98,25.28,78.98,1.55,'Solar:3g;Executioner:2b;Summoner:2b;Spellweaver:2b;Juggernaut:2b;Blossom:3b','Karma[bluebuff,jeweled,rabadon];Leona;Yorick;Kayle;Leblanc[redbuff,void];Sejuani[gargoyle,gargoyle,warmog];Yunara[deathblade,lw,shojin];Azir'],
  ['than-rung-teemo','S','Thần Rừng Teemo',6,'Easy',3.23,12.03,80.41,1.62,'Invoker:3s;Brawler:2b;Vanguard:2b;Spellweaver:2b;Elderwood:3b;Sprykin:3b','Kobuko;Veigar;Alistar[gargoyle,gargoyle,warmog];Leblanc[jeweled,rabadon,shojin];Teemo[jeweled,shojin,flail];Hecarim;Morgana[gunblade,morello,void];Sentinel'],
  ['tien-phong-alune','S','Tiên Phong Alune',9,'Hard',3.09,28.83,75.46,1.02,'Attuned:1g;Greenfather:1g;Emerald Aspect:1g;Vanguard:4s;Flora Fatalis:1b;Lunar:2b;Spellweaver:2b;Defender:2b;Fae:2b;Invoker:2b','Rakan;Diana;Fiddlesticks;Lillia;Morgana[morello,shojin,void];Sentinel[gargoyle,protector,warmog];Alune[jeweled,shojin,flail];Ivern;Taric[gargoyle,steadfast,warmog]'],
  ['dao-phu-azir','S','Đao Phủ Azir',7,'Normal',2.83,24.58,83.47,0.74,'Thornmaiden:1g;Flora Fatalis:2g;Executioner:3s;Blackthorn:2b;Summoner:2b;Defender:2b;Spellweaver:2b;Sprykin:3b','Veigar;Teemo;Azir[guinsoo,gunblade,rabadon];Fiddlesticks[bluebuff,eon,thief];Rammus[crownguard,gargoyle,gargoyle];Soraka;Zyra[morello,shojin,void];Kennen'],
  ['tien-phong-alune-coven','S','Tiên Phong Alune Tiên Hắc Ám',8,'Hard',3.27,24.91,73.72,0.46,'Attuned:1g;Apex Predator:1g;Emerald Aspect:1g;Vanguard:4s;Lunar:2b;Spellweaver:2b;Invoker:2b;Coven:3b;Riftbeast:3b','Elise;Cassiopeia;Diana;Morgana[morello,rabadon,void];Sentinel[gargoyle,protector,warmog];Alune[jeweled,nashor,shojin];ElderDragon[ie,lw,flail];Taric'],
  ['mat-trang-sejuani','S','Mặt Trăng Sejuani',6,'Easy',2.95,24.92,79.87,0.49,'Solar:3g;Lunar:3s;Rapidfire:3s;Inferno:3s;Defender:2b;Juggernaut:2b;Eclipse:6g','Leona;Varus;Kayle[emblunar,guinsoo,rabadon];Sejuani[gargoyle,spirit,warmog];Shen[gargoyle,spirit,warmog];Diana;Amumu;Aphelios[gs,kraken,lw]'],
  ['thich-ung-rengar','A','Thích Ứng Rengar',7,'Normal',3.04,23.79,80.31,0.61,'Rival:1g;Caustic:1g;Adaptor:3s;Brawler:2b;Juggernaut:2b;Primal:2b;Blossom:3b','Yorick;KogMaw;Krug;MasterYi[eon,guinsoo,titans];Rengar[eon,guinsoo,titans];Vi[gargoyle,spirit,warmog];Nidalee[ie,shojin,sterak];Sett'],
  ['dung-si-ashe','A','Dũng Sĩ Ashe',9,'Hard',3.02,26.38,75.46,0.26,'Greenfather:1g;Old Growth:1g;Emerald Aspect:1g;Juggernaut:4s;Hunter:2b;Inferno:2b;Vanguard:2b;Primal:2b','Rakan;Vi;Amumu;Sivir[ie,shojin,flail];Ashe[lw,redbuff,shojin];Ivern;Kennen[bt,eon,rabadon];Maokai[gargoyle,spirit,warmog];Taric'],
  ['dung-si-zyra','A','Dũng Sĩ Zyra',8,'Normal',3.23,20.74,75.00,0.29,'Old Growth:1g;Thornmaiden:1g;Juggernaut:6g;Hunter:2b;Primal:2b;Summoner:2b','Yorick;CuaKyCuc;Sejuani;Vi;Amumu[gargoyle,spirit,warmog];Sivir[gs,ie,flail];Zyra[archangel,archangel,gunblade];Ashe[lw,redbuff,shojin];Maokai'],
  ['ve-quan-cassiopeia','A','Vệ Quân Cassiopeia',7,'Normal',3.81,10.29,64.63,0.49,'Flora Fatalis:2g;Defender:6g;Spellweaver:2b','Leona;Ornn;Shen;Cassiopeia[archangel,bluebuff,gunblade];Fiddlesticks[ionic,spirit,sunfire];Rammus[gargoyle,steadfast,warmog];Lillia;Soraka[jeweled,nashor,shojin]'],
  ['than-rung-ezreal-lv8','A','Thần Rừng Ezreal (Lv8)',8,'Normal',4.08,12.61,57.96,0.52,'Emerald Aspect:1g;Elderwood:7g;Flora Fatalis:1b;Brawler:2b;Executioner:2b;Vanguard:2b','Ornn;Xayah;Alistar;Leblanc;Hecarim;Ezreal[deathblade,lw,shojin];Soraka[archangel,rabadon,shojin];Gnar[bt,sterak,titans];Taric[gargoyle,protector,warmog]'],
  ['gai-den-warwick','A','Gai Đen Warwick',6,'Easy',3.72,8.11,71.62,0.35,'Monolith:1g;Blackthorn:4s;Ravager:4s;Brawler:2b;Riftbeast:3b','RekSai;Murkwolf[deathblade,eon,hoj];Warwick[shojin,sterak,titans];Azir[guinsoo,morello,void];Diana;Krug;Brambleback;Malphite[crownguard,gargoyle,warmog]'],
  ['dao-phu-soraka','A','Đao Phủ Soraka',8,'Normal',2.97,19.81,83.96,0.17,'Monolith:1g;Thornmaiden:1g;Flora Fatalis:2g;Summoner:3g;Executioner:4g;Blackthorn:2b;Inferno:2b;Juggernaut:2b','Yorick;Azir;Fiddlesticks;Amumu;Ezreal;Malphite[crownguard,gargoyle,warmog];Soraka[archangel,rabadon,shojin];Zyra[archangel,shojin,void];Kennen[adaptive,flail,thief]'],
  ['lien-kich-kayle','A','Liên Kích Kayle',6,'Easy',3.18,17.95,76.92,0.18,'Solar:3g;Rapidfire:3s;Vanguard:2b;Defender:2b;Fae:2b;Juggernaut:2b;Elderwood:3b','Leona;Ornn[gargoyle,spirit,warmog];Rakan;Xayah[deathblade,guinsoo,redbuff];Kayle[guinsoo,jeweled,rabadon];Sejuani[gargoyle,spirit,warmog];Hecarim;Aphelios'],
  ['quai-rung-krug','A','Quái Rừng Quái Đá Krug',8,'Normal',4.49,4.57,52.40,0.65,'Riftbeast:9g;Invoker:2b;Ravager:2b','MamNon;Pebbles[bluebuff,jeweled,rabadon];CocThanhTinh;Murkwolf;CuaKyCuc;Krug[gargoyle,spirit,warmog];ChimMe[gs,guinsoo,ie];Brambleback[eon,guinsoo,qss];Sentinel'],
  ['dao-phu-ezreal','C','Đao Phủ Ezreal',8,'Normal',4.46,2.97,46.53,0.16,'Flora Fatalis:2g;Executioner:4g;Spellweaver:2b;Brawler:2b;Defender:2b;Blossom:3b;Elderwood:3b','Ornn;Alistar;Yunara;Fiddlesticks;Ahri[embexec,bluebuff,rabadon];Ezreal[deathblade,lw,shojin];Sett[gargoyle,gargoyle,warmog];Soraka[gunblade,rabadon,shojin]'],
  ['hoa-linh-ahri','D','Hoa Linh Ahri',8,'Normal',4.60,8.63,46.27,0.40,'Emerald Aspect:1g;Invoker:3s;Spellweaver:2b;Brawler:2b;Vanguard:2b;Blossom:3b;Riftbeast:3b','Karma;Pebbles;Krug;Ahri[jeweled,shojin,flail];Morgana[morello,rabadon,void];Sentinel[gargoyle,protector,warmog];Sett[gargoyle,sterak,warmog];Taric'],
  ['quai-rung-sivir','D','Quái Rừng Sivir',8,'Normal',5.06,5.50,35.78,0.17,'Monolith:1g;Caustic:1g;Blackthorn:2b;Brawler:2b;Hunter:2b;Primal:2b;Adaptor:2b;Invoker:2b;Riftbeast:3b','MamNon;RekSai;KogMaw;Krug;Malphite[crownguard,gargoyle,warmog];Nidalee[ie,shojin,sterak];Sentinel[adaptive,protector];Sivir[ie,redbuff,flail]'],
  ['mat-trang-aphelios','D','Mặt Trăng Aphelios',8,'Normal',4.19,8.69,57.98,1.34,'Caustic:1g;Lunar:2b;Rapidfire:2b;Vanguard:2b;Inferno:2b;Juggernaut:2b;Adaptor:2b;Invoker:2b;Primal:2b','Varus;Diana;KogMaw;Vi;Amumu[gargoyle,spirit,warmog];Aphelios[gs,guinsoo,kraken]']
];
const DIFF_VI = { Hard: 'Khó', Normal: 'Trung Bình', Easy: 'Dễ' };
const FALLBACK_SET18_COMPS = COMP_DATA.map(([id, tier, name, lv, diff, avg, first, top4, pick, traits, units]) => ({
  id, tier, name, playstyle: `Lv ${lv}`, difficulty: DIFF_VI[diff] || diff,
  avgPlace: avg, pickRate: pick, winRate: first, top4Rate: top4, setTag: 'TFTSet18',
  earlyUnits: [], leveling: `Cấp ${lv}`, carousel: '', augments: [],
  traits: traits.split(';').map((t) => { const [n, c] = t.split(':'); return { name: n, count: parseInt(c, 10), style: { g: 'gold', s: 'silver', b: 'bronze' }[c.slice(-1)] }; }),
  units: autoPlace(units.split(';').map((x) => {
    const m = x.match(/^(\w+)(?:\[(.*)\])?$/);
    const info = lookupChamp(m[1].toLowerCase());
    return { key: m[1], name: info?.name || m[1], cost: info?.cost || 3, star: 2, items: m[2] ? m[2].split(',') : [] };
  }))
}));

const AugmentBadge = ({ augId, compact = false }) => {
  const index = useAugmentIndex();
  const aug = AUGMENTS_CATALOG[augId] || { id: augId, name: augId, tier: 'Gold', avgPlace: 3.9, desc: 'Lõi nâng cấp.', icon: '' };
const [step, setStep] = useState(0);
const candidates = useMemo(() => {
  const list = [];
  const cd = pickAugmentIcon(aug, index);
  if (cd) list.push(cd);
  list.push(...metaTFTCandidates(aug));
  return list;
}, [augId, index]);
useEffect(() => { setStep(0); }, [candidates.length]);
const iconUrl = candidates[step] || '';

  const tierStyles = {
    Prismatic: 'bg-gradient-to-r from-fuchsia-950/80 via-indigo-950/80 to-cyan-950/80 border-fuchsia-400/60 text-fuchsia-200',
    Gold: 'bg-[#2a2315] border-[#c89b3c]/60 text-[#fbd38d]',
    Silver: 'bg-[#1e2328] border-slate-400/50 text-slate-200'
  };
  const frameStyles = {
    Prismatic: 'border-2 border-fuchsia-300 shadow-[0_0_8px_rgba(217,70,239,0.7)]',
    Gold: 'border-2 border-[#e0b04a] shadow-[0_0_8px_rgba(224,176,74,0.55)]',
    Silver: 'border-2 border-slate-300 shadow-[0_0_6px_rgba(203,213,225,0.45)]'
  };
  const frame = frameStyles[aug.tier] || frameStyles.Gold;
  const showImg = !!iconUrl;

  if (compact) {
    return (
      <div title={aug.desc ? `${aug.name} — ${aug.desc}` : aug.name} className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-sm border text-[10px] font-bold shadow-sm ${tierStyles[aug.tier] || tierStyles.Gold}`}>
        <span className={`w-6 h-6 rounded-[4px] bg-black/60 shrink-0 flex items-center justify-center overflow-hidden ${frame}`}>
          {showImg ? (
            <img src={iconUrl} alt={aug.name} loading="lazy" onError={() => setStep((s) => s + 1)} className="w-full h-full object-cover" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          )}
        </span>
        <span className="truncate max-w-[150px] drop-shadow-sm">{aug.name}</span>
      </div>
    );
  }

  return (
    <div className={`p-2.5 rounded-md border shadow-md flex items-start gap-2.5 ${tierStyles[aug.tier] || tierStyles.Gold}`}>
      <div className={`w-10 h-10 rounded-md bg-black/60 shrink-0 flex items-center justify-center overflow-hidden ${frame}`}>
        {showImg ? (
          <img src={iconUrl} alt={aug.name} loading="lazy" onError={() => setStep((s) => s + 1)} className="w-full h-full object-cover" />
        ) : (
          <Sparkles className="w-4 h-4 text-amber-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-white truncate drop-shadow-sm">{aug.name}</span>
          {aug.avgPlace ? <span className="text-[10px] font-black text-emerald-400 shrink-0">#{aug.avgPlace} Avg</span> : null}
        </div>
        {aug.desc ? <p className="text-[11px] text-gray-300/90 mt-0.5 leading-snug">{aug.desc}</p> : null}
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
    const info0 = lookupChamp(lowerKey);
    const dk = info0 ? info0.key.toLowerCase() : lowerKey;
    if (dynamicChampMap && dynamicChampMap[dk]?.iconUrl) list.push(dynamicChampMap[dk].iconUrl); // CDragon trước
    if (info0?.img) list.push(info0.img); // metatft.gg nếu CDragon chưa có
    if (info0?.opgg) list.push(info0.opgg);
    list.push(`https://cdn.metatft.com/file/metatft/champions/da_18_${lowerKey}.png`);
    list.push(`https://cdn.metatft.com/file/metatft/champions/tft18_${lowerKey}.png`);
    list.push(`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${cleanKey}.png`);
    return list;
  }, [lowerKey, cleanKey, dynamicChampMap]);

  const currentImgUrl = candidateUrls[Math.min(fallbackStep, candidateUrls.length - 1)];
  const costBorders = { 1: 'border-[#788292]', 2: 'border-[#11b288]', 3: 'border-[#207ac7]', 4: 'border-[#c440da]', 5: 'border-[#ffb93b]' };
  const sizeDims = { sm: 'w-10 h-10', md: 'w-[52px] h-[52px]', lg: 'w-14 h-14' };
  const info = lookupChamp(lowerKey);
  const cost = info?.cost || unit.cost || 3;

  return (
    <div onClick={onClick} className={`group flex flex-col items-center select-none ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="h-3 flex items-center justify-center">
        {unit.star === 3 && <span className="text-[11px] leading-none text-[#fbbf24] font-black tracking-tighter drop-shadow-md">★★★</span>}
      </div>

      <div className="relative">
        <div className={`relative ${sizeDims[size] || sizeDims.md} rounded-md border-2 ${costBorders[cost] || costBorders[3]} bg-[#14171f] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,.55)]`}>
          <img
            src={currentImgUrl}
            alt={unit.name || unit.key}
           onError={() => setFallbackStep((s) => s + 1)}
            className="w-full h-full object-cover object-center"
          />
        </div>

        {unit.items && unit.items.length > 0 && (
          <div className="absolute -bottom-2 inset-x-0 flex items-center justify-center gap-[2px] z-10">
            {unit.items.slice(0, 3).map((itemId, idx) => {
              const itemObj = ITEMS_CATALOG[ITEM_ALIAS[itemId] || itemId];
              return itemObj ? (
                <img key={idx} src={itemObj.icon} alt={itemObj.name} title={itemObj.name} className="w-[18px] h-[18px] rounded-[3px] ring-1 ring-black/70 border border-[#c89b3c]/40 bg-slate-950 shadow-md" />
              ) : null;
            })}
          </div>
        )}
      </div>

      {showName && (
        <span className="mt-2 w-[62px] text-[11px] text-[#ece4d0] font-semibold leading-[1.15] clamp2 text-center">
          {info?.name || unit.name || unit.key}
        </span>
      )}
    </div>
  );
};

const HoneycombBoard4x7 = ({ units = [], dynamicChampMap, interactive = false, onCellClick }) => {
  const unitPosMap = useMemo(() => {
    const map = new Map();
    units.forEach(u => { if (u.row !== undefined && u.col !== undefined) map.set(`${u.row}-${u.col}`, u); });
    return map;
  }, [units]);

  const costHexColors = { 1: 'bg-[#788292]', 2: 'bg-[#11b288]', 3: 'bg-[#207ac7]', 4: 'bg-[#c440da]', 5: 'bg-[#ffb93b]' };

  return (
    <div className="bg-[#091428] border border-[#c89b3c]/20 shadow-inner rounded-md p-3 select-none">
      <div className="text-[11px] font-bold text-[#a09b8c] mb-2 flex items-center justify-between">
        <span>Sơ đồ xếp bài chuẩn (bàn cờ 4x7)</span>
        <span className="text-[10px] text-[#c89b3c]">Hàng trên: Chống chịu • Hàng dưới: Chủ lực</span>
      </div>
      <div className="flex flex-col gap-1.5 items-center py-1">
        {[0, 1, 2, 3].map(row => (
          <div key={row} className={`flex items-center gap-1.5 ${row % 2 === 1 ? 'ml-6 sm:ml-7' : ''}`}>
            {[0, 1, 2, 3, 4, 5, 6].map(col => {
              const cellUnit = unitPosMap.get(`${row}-${col}`);
              const cleanKey = cellUnit ? (cellUnit.key || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
              const cInfo = cellUnit ? lookupChamp(cleanKey) : null;
              const imgUrl = cellUnit ? (dynamicChampMap?.[cInfo ? cInfo.key.toLowerCase() : cleanKey]?.iconUrl || cInfo?.img || `https://cdn.metatft.com/file/metatft/champions/da_18_${cleanKey}.png`) : '';

              return (
                <div key={col} onClick={() => interactive && onCellClick && onCellClick(row, col, cellUnit)} className={`relative flex flex-col items-center ${interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}>
                  <div style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)' }} className={`w-10 h-11 sm:w-11 sm:h-12 p-[2px] flex items-center justify-center shadow-lg ${cellUnit ? costHexColors[cInfo?.cost || cellUnit.cost] || 'bg-[#c89b3c]' : 'bg-[#1e2328] hover:bg-[#c89b3c]/30'}`}>
                    <div style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)' }} className="w-full h-full bg-[#0a1428] overflow-hidden flex items-center justify-center">
                      {cellUnit ? (
                        <img src={imgUrl} alt={cellUnit.name} onError={(e) => { e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${cellUnit.key}.png`; }} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] text-[#f0e6d2]/20 font-bold">{row + 1}-{col + 1}</span>
                      )}
                    </div>
                  </div>
                  {cellUnit && <span className="text-[9px] text-[#f0e6d2] font-bold mt-0.5 truncate max-w-[44px] drop-shadow-md">{cInfo?.name || cellUnit.name || cellUnit.key}</span>}
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
  const viName = TRAIT_VI[trait.name] || trait.name;
  const cleanTrait = trait.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const traitIconUrl = dynamicTraitMap?.[normAugName(viName)]?.iconUrl || dynamicTraitMap?.[normAugName(trait.name)]?.iconUrl || `https://c-tft-api.op.gg/img/set/18/tft-trait/Trait_Icon_18_${OPGG_TRAIT[trait.name] || trait.name.replace(/\s+/g, '')}.TFT_Set18.png`;

  const styles = {
    gold: 'bg-gradient-to-b from-[#3a2d15] to-[#2a2010] border-[#c89b3c]/80 text-[#f7dc98]',
    silver: 'bg-gradient-to-b from-[#2a2f39] to-[#1f232b] border-[#8b9bb4]/80 text-[#e3eaf5]',
    bronze: 'bg-gradient-to-b from-[#2e211a] to-[#221813] border-[#965d37]/80 text-[#e6b693]'
  };

  return (
    <div title={viName} className={`inline-flex items-center gap-1.5 pl-1.5 pr-2 py-[3px] rounded-md border text-[12px] leading-none font-semibold ${styles[trait.style] || styles.bronze}`}>
      {!iconErr ? (
        <img src={traitIconUrl} alt={trait.name} onError={() => setIconErr(true)} className="w-4 h-4 object-contain" />
      ) : (
        <span className="text-[9px]">◆</span>
      )}
      <span><b className="font-extrabold mr-0.5">{trait.count}</b>{viName}</span>
    </div>
  );
};

export default function MetaTFTApp() {
  const [activeNav, setActiveNav] = useState('comps');
  const [expandedComps, setExpandedComps] = useState({});
  const [copiedCompId, setCopiedCompId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSetNumber, setCurrentSetNumber] = useState(18);
  const [currentSetName, setCurrentSetName] = useState('Enchanted Wilds');
  const [dynamicChampMap, setDynamicChampMap] = useState({});
  const [dynamicTraitMap, setDynamicTraitMap] = useState({});
  const [compsList] = useState(FALLBACK_SET18_COMPS);
  const [toast, setToast] = useState(null);

  const [builderUnits, setBuilderUnits] = useState(FALLBACK_SET18_COMPS[0].units);
  const [selectedBuilderChamp, setSelectedBuilderChamp] = useState(CHAMPIONS_HEX_ROSTER[0]);
  const [importCodeInput, setImportCodeInput] = useState('');

  const toggleCompDetails = (compId, e) => {
    if (e) e.stopPropagation();
    setExpandedComps(prev => ({ ...prev, [compId]: !prev[compId] }));
  };

  useEffect(() => {
    document.title = "Brown's Meta Book - Set 18";
  }, []);

  useEffect(() => {
    let alive = true;
    loadCDragon().then((o) => { if (alive) { setDynamicChampMap(o.champ); setDynamicTraitMap(o.trait); } });
    return () => { alive = false; };
  }, []);

  const triggerToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const handleCopyTeamCode = (comp, e) => {
    if (e) e.stopPropagation();
    const code = encodeTeamPlannerCode(comp.units, comp.setTag || 'TFTSet18');
    navigator.clipboard?.writeText(code);
    setCopiedCompId(comp.id);
    triggerToast(`Đã copy mã "${comp.name}"`);
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
      if (builderUnits.length >= 10) return triggerToast('Tối đa 10 tướng!');
      setBuilderUnits(prev => [...prev, { key: selectedBuilderChamp.key, name: selectedBuilderChamp.name, cost: selectedBuilderChamp.cost, star: 2, row, col, items: [] }]);
    }
  };

  const builderPlannerCode = useMemo(() => encodeTeamPlannerCode(builderUnits, 'TFTSet18'), [builderUnits]);

  return (
    <div className="min-h-screen bg-[#0a1428] text-[#f0e6d2] flex flex-col app-root antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');
        .app-root { font-family: 'Be Vietnam Pro', 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; font-feature-settings: 'tnum' 1; }
        .app-root img { image-rendering: auto; backface-visibility: hidden; transform: translateZ(0); }
        .team-title { font-weight: 700; letter-spacing: -0.005em; }
        .clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .comp-card { background: linear-gradient(180deg, #20262d 0%, #1a1f26 100%); box-shadow: 0 1px 0 rgba(255,255,255,.03) inset, 0 6px 18px -10px rgba(0,0,0,.7); transition: border-color .15s, transform .15s, box-shadow .15s; }
        .comp-card:hover { transform: translateY(-1px); box-shadow: 0 1px 0 rgba(255,255,255,.04) inset, 0 12px 26px -12px rgba(0,0,0,.85); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3a3f48; border-radius: 6px; }
        ::-webkit-scrollbar-thumb:hover { background: #c89b3c; }
      `}</style>

      {toast && (
        <div className="fixed top-16 right-5 z-50 bg-[#1e2328] border border-[#c89b3c] text-[#f0e6d2] px-4 py-2.5 rounded-sm shadow-lg flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-[#c89b3c]" />
          <span>{toast}</span>
        </div>
      )}

      <header className="bg-[#091428]/90 backdrop-blur-md border-b border-[#c89b3c]/30 sticky top-0 z-40 shadow-[0_8px_24px_-12px_rgba(0,0,0,.8)]">
        <div className="max-w-[1340px] mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <img src="https://ddragon.leagueoflegends.com/cdn/14.24.1/img/tft-item/TFT_Item_Spatula.png" alt="Spatula" className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-md shrink-0" />
            <span className="font-bold text-base sm:text-lg text-[#f4ecd8] tracking-wide whitespace-nowrap">Brown's Meta Book</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
            {[
              { id: 'comps', label: 'Tier List & Lõi' },
              { id: 'builder', label: 'Team Builder' },
              { id: 'augments', label: 'Bảng Xếp Hạng' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveNav(tab.id)}
                className={`px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-all border ${
                  activeNav === tab.id ? 'bg-[#1e2328] text-[#c89b3c] border-[#c89b3c]/80' : 'bg-transparent text-[#a09b8c] border-transparent hover:text-[#f0e6d2]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1340px] w-full mx-auto px-4 py-5 flex-1 space-y-4">
        {activeNav === 'comps' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#f4ecd8] tracking-tight">Meta Team Comps Tier List ({compsList.length} Đội Hình)</h1>
                <p className="text-[12px] text-[#b9b3a3] mt-1">Nguồn: {COMPS_SOURCE}</p>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm đội hình, tướng..."
                className="bg-[#1e2328] border border-[#c89b3c]/30 rounded-md px-3 py-2 text-[13px] text-[#f0e6d2] outline-none w-64 focus:border-[#c89b3c] placeholder:text-[#7d786b]"
              />
            </div>

            <div className="space-y-3">
              {compsList
                .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.units.some(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())))
                .map(comp => {
                  const isExpanded = !!expandedComps[comp.id];
                  const isCopied = copiedCompId === comp.id;
                  const teamCode = encodeTeamPlannerCode(comp.units, comp.setTag);
                  const tierColors = { OP: 'bg-gradient-to-b from-[#ff5a78] to-[#e0264a] text-white', D: 'bg-gradient-to-b from-[#9aabbd] to-[#74869a] text-[#141518]', S: 'bg-gradient-to-b from-[#ff8585] to-[#f05a5a] text-[#1a0d0d]', A: 'bg-gradient-to-b from-[#ffd979] to-[#f5b92f] text-[#1f1705]', B: 'bg-gradient-to-b from-[#6fe3ff] to-[#2fbfe6] text-[#06222b]', C: 'bg-gradient-to-b from-[#bcc6d3] to-[#97a3b3] text-[#141518]' };

                  return (
                    <div key={comp.id} className="comp-card border border-white/[0.07] rounded-lg overflow-hidden hover:border-[#c89b3c]/50">
                      <div onClick={(e) => toggleCompDetails(comp.id, e)} className="p-3 sm:px-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer">
                        <div className="flex items-center gap-3 lg:w-[220px] shrink-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-[17px] ring-1 ring-white/20 shadow-[0_3px_10px_-2px_rgba(0,0,0,.6)] ${tierColors[comp.tier] || tierColors.S}`}>
                            {comp.tier}
                          </div>
                          <div>
                            <div className="team-title text-[16px] text-white leading-snug">{comp.name}</div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="px-2 py-[3px] rounded-md text-[11px] font-semibold border bg-[#0b1a33] text-[#7dd3f0] border-[#31708f]/80">{comp.playstyle}</span>
                              <span className="px-2 py-[3px] rounded-md text-[11px] font-semibold border bg-[#14291d] text-[#6fd16f] border-[#2b542c]">{comp.difficulty}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {comp.traits.map((tr, idx) => <TraitBadge key={idx} trait={tr} dynamicTraitMap={dynamicTraitMap} />)}
                          </div>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                            {comp.units.map((u, idx) => <ChampionPortraitTile key={idx} unit={u} dynamicChampMap={dynamicChampMap} />)}
                          </div>
                          {(comp.augments || []).length > 0 && <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                            <span className="text-[10px] font-bold text-[#c89b3c] flex items-center gap-1 mr-1">
                              <Sparkles className="w-3.5 h-3.5" /> Lõi chuẩn:
                            </span>
                            {(comp.augments || []).map((augId, i) => <AugmentBadge key={i} augId={augId} compact={true} />)}
                          </div>}
                        </div>

                        <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-2.5 lg:w-[340px] shrink-0 border-t lg:border-t-0 border-white/5 pt-2.5 lg:pt-0">
                          <div className="flex items-center gap-1.5 self-end">
                            <button onClick={(e) => handleCopyTeamCode(comp, e)} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-bold border transition-all ${isCopied ? 'bg-[#11b288] text-white border-[#11b288]' : 'bg-[#091428] hover:bg-[#c89b3c] text-[#c89b3c] border-[#c89b3c]/50'}`}>
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isCopied ? 'Đã Copy!' : 'Copy Mã'}</span>
                            </button>
                            <button onClick={(e) => handleOpenInBuilder(comp, e)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-semibold bg-[#0b1a33] hover:bg-[#207ac7] text-[#c9c3b3] hover:text-white border border-white/10 transition-colors">
                              <Wrench className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Sửa Bài</span>
                            </button>
                            <button onClick={(e) => toggleCompDetails(comp.id, e)} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-semibold border bg-[#0b1a33] text-[#c9c3b3] border-white/10 hover:text-white transition-colors">
                              <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-3 text-center tabular-nums w-full pt-1">
                            <div><div className="text-[15px] font-bold text-[#2fd3a6]">{comp.avgPlace.toFixed(2)}</div><div className="text-[11px] text-[#b9b3a3] mt-0.5 whitespace-nowrap">Hạng trung bình</div></div>
                            <div><div className="text-[15px] font-bold text-[#f4ecd8]">{comp.pickRate.toFixed(2)}%</div><div className="text-[11px] text-[#b9b3a3] mt-0.5 whitespace-nowrap">Tỷ lệ chọn</div></div>
                            <div><div className="text-[15px] font-bold text-[#ff7a7a]">{comp.winRate.toFixed(1)}%</div><div className="text-[11px] text-[#b9b3a3] mt-0.5 whitespace-nowrap">Tỷ lệ thắng</div></div>
                            <div><div className="text-[15px] font-bold text-[#2fd3a6]">{comp.top4Rate.toFixed(1)}%</div><div className="text-[11px] text-[#b9b3a3] mt-0.5 whitespace-nowrap">Tỷ lệ Top 4</div></div>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-[#091428] border-t border-[#c89b3c]/20 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                          <div className="lg:col-span-7 space-y-3">
                            <HoneycombBoard4x7 units={comp.units} dynamicChampMap={dynamicChampMap} />
                            <div className="bg-[#1e2328] border border-[#c89b3c]/40 rounded-sm p-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-[11px] font-extrabold text-[#c89b3c] uppercase">Mã Team Planner</div>
                                <div className="font-mono text-xs text-[#f0e6d2] truncate mt-1 select-all">{teamCode}</div>
                              </div>
                              <button onClick={(e) => handleCopyTeamCode(comp, e)} className="px-4 py-2 rounded-sm bg-[#c89b3c] hover:bg-[#d4a84d] text-[#091428] font-extrabold text-xs flex items-center gap-1.5 shrink-0">
                                <Copy className="w-3.5 h-3.5" /> Copy Vào Game
                              </button>
                            </div>
                          </div>
                          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                            <div className="bg-[#1e2328] border border-[#c89b3c]/20 rounded-sm p-3 space-y-2.5">
                              <div className="text-xs font-extrabold text-[#c89b3c] flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4" /> Lõi Tốt Nhất
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {(comp.augments || []).length ? (comp.augments || []).map((augId, idx) => <AugmentBadge key={idx} augId={augId} compact={false} />) : <div className="text-[11px] text-[#a09b8c]">TFT.OP.GG chưa cung cấp lõi cho đội hình này.</div>}
                              </div>
                            </div>
                            <div className="bg-[#1e2328] border border-[#c89b3c]/20 rounded-sm p-3 space-y-2 text-xs">
                              <div><span className="text-[#a09b8c]">Đầu game: </span><span className="text-[#0ac8b9] font-bold">{(comp.earlyUnits || []).map(champName).join(', ') || '—'}</span></div>
                              <div><span className="text-[#a09b8c]">Lên cấp: </span><span className="text-[#f0e6d2] font-bold">{comp.leveling}</span></div>
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

        {activeNav === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 space-y-3">
              <div className="bg-[#1e2328] border border-[#c89b3c]/30 p-3 rounded-sm flex items-center justify-between">
                <span className="text-xs font-bold text-[#f0e6d2]">Đang chọn: <strong className="text-[#c89b3c]">{selectedBuilderChamp.name}</strong> ({builderUnits.length}/10)</span>
                <button onClick={() => setBuilderUnits([])} className="px-2.5 py-1 rounded-sm bg-[#ff6b6b]/10 text-xs text-[#ff6b6b] font-bold flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Xóa Bàn
                </button>
              </div>
              <HoneycombBoard4x7 units={builderUnits} dynamicChampMap={dynamicChampMap} interactive={true} onCellClick={handleBuilderCellClick} />
              <div className="bg-[#1e2328] border border-[#c89b3c]/30 p-3 rounded-sm space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs text-[#c89b3c] bg-[#091428] px-3 py-1.5 rounded-sm border border-[#c89b3c]/20 flex-1 truncate">{builderPlannerCode}</div>
                  <button onClick={() => { navigator.clipboard?.writeText(builderPlannerCode); triggerToast('Đã copy mã bàn cờ!'); }} className="px-3.5 py-1.5 rounded-sm bg-[#c89b3c] text-[#091428] font-extrabold text-xs flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={importCodeInput} onChange={e => setImportCodeInput(e.target.value)} placeholder="Dán mã code vào đây..." className="flex-1 bg-[#091428] border border-[#c89b3c]/30 rounded-sm px-3 py-1.5 text-xs text-[#f0e6d2]" />
                  <button onClick={() => { const res = decodeTeamPlannerCode(importCodeInput); if (res?.units?.length) { setBuilderUnits(res.units); triggerToast('Đã import mã!'); } else triggerToast('Mã sai!'); }} className="px-4 py-1.5 rounded-sm bg-[#207ac7] text-xs font-bold text-white">
                    Import
                  </button>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 bg-[#1e2328] border border-[#c89b3c]/30 p-3.5 rounded-sm">
              <div className="text-xs font-extrabold text-[#c89b3c] mb-3">Kho Tướng</div>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-[460px] overflow-y-auto pr-1">
                {CHAMPIONS_HEX_ROSTER.map(ch => (
                  <div key={ch.key} onClick={() => setSelectedBuilderChamp(ch)} className={`p-1 rounded-sm border cursor-pointer ${selectedBuilderChamp.key === ch.key ? 'border-[#c89b3c] bg-[#c89b3c]/10' : 'border-transparent hover:bg-white/5'}`}>
                    <ChampionPortraitTile unit={ch} dynamicChampMap={dynamicChampMap} size="sm" showName={false} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeNav === 'augments' && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-[#f0e6d2]">Bảng Xếp Hạng Lõi Nâng Cấp</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.keys(AUGMENTS_CATALOG).map(augKey => <AugmentBadge key={augKey} augId={augKey} compact={false} />)}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <MetaTFTApp />
    </React.StrictMode>
  );
}

// 爱豆"还原真人"的默认发色（近似，玩家可在捏脸器里改）。
// 只定发色即可——衣着由 hash 生成多样化；未列出的成员回退到 hash。
export const IDOL_HAIR: Record<string, string> = {
  // ITZY
  yeji: '#a56a35', ryujin: '#2b2320', lia: '#5a3d2b', chaeryeong: '#3a2a22', yuna_itzy: '#c98b4a',
  // aespa
  karina: '#3a2a22', winter: '#2b2320', giselle: '#5a3d2b', ningning: '#6e2b2b',
  // IVE
  wonyoung: '#6b4a2f', yujin_ive: '#3a2a22', gaeul: '#2b2320', rei: '#5a3d2b', liz: '#7a5236', leeseo: '#3a2a22',
  // LE SSERAFIM
  sakura: '#d9b382', chaewon: '#c98b4a', yunjin: '#3a2a22', kazuha: '#2b2320', eunchae: '#3a2a22',
  // ILLIT
  yunah: '#7a5236', minju: '#5a3d2b', moka: '#3a2a22', wonhee: '#6b4a2f', iroha: '#2b2320',
  // NMIXX
  lily_nmixx: '#5a3d2b', haewon_nmixx: '#3a2a22',
};

// 捏脸器可选色板
export const SKIN_TONES = ['#f0c9a8', '#e6b48c', '#d9a475', '#c2895a', '#a86e42'];
export const HAIR_COLORS = ['#2b2320', '#3a2a22', '#5a3d2b', '#6b4a2f', '#7a5236', '#a56a35', '#c98b4a', '#d9b382', '#e8c9a0', '#6e2b2b', '#8a4a3a', '#2a2a3a', '#d98aa8', '#b56bd9', '#6a8ac9'];
export const CLOTH_COLORS = ['#c0392b', '#e84393', '#8e44ad', '#2980b9', '#16a085', '#27ae60', '#e67e22', '#f39c12', '#34495e', '#2c3e50', '#ecf0f1', '#f5f0e8', '#1c1c1c', '#d98aa8'];

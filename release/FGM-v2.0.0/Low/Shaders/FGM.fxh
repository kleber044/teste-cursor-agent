// FGM 2.0 — funções originais compartilhadas.
// Somente o buffer de cor. Sem profundidade, sem add-on, sem memória do jogo.

static const float3 FGM_LUMA_W = float3(0.2126, 0.7152, 0.0722);
static const float FGM_ROAD_LUMA_SCALE = 0.981364;

float FGM_Luma(float3 c) {
  return dot(c, FGM_LUMA_W);
}

float3 FGM_RgbToHsv(float3 c) {
  float maxc = max(c.r, max(c.g, c.b));
  float minc = min(c.r, min(c.g, c.b));
  float delta = maxc - minc;
  float h = 0.0;
  if (delta > 1e-6) {
    if (maxc == c.r) h = fmod((c.g - c.b) / delta, 6.0);
    else if (maxc == c.g) h = (c.b - c.r) / delta + 2.0;
    else h = (c.r - c.g) / delta + 4.0;
    h *= 60.0;
    if (h < 0.0) h += 360.0;
  }
  float s = maxc <= 0.0 ? 0.0 : delta / maxc;
  return float3(h, s, maxc);
}

float3 FGM_HsvToRgb(float h, float s, float v) {
  float wrapped = fmod(fmod(h, 360.0) + 360.0, 360.0);
  float c = v * s;
  float hp = wrapped / 60.0;
  float x = c * (1.0 - abs(fmod(hp, 2.0) - 1.0));
  float3 rgb = float3(0.0, 0.0, 0.0);
  if (hp < 1.0) rgb = float3(c, x, 0.0);
  else if (hp < 2.0) rgb = float3(x, c, 0.0);
  else if (hp < 3.0) rgb = float3(0.0, c, x);
  else if (hp < 4.0) rgb = float3(0.0, x, c);
  else if (hp < 5.0) rgb = float3(x, 0.0, c);
  else rgb = float3(c, 0.0, x);
  return rgb + (v - c);
}

float FGM_HueWindow(float h, float rise0, float rise1, float fall0, float fall1) {
  return smoothstep(rise0, rise1, h) * (1.0 - smoothstep(fall0, fall1, h));
}

float FGM_SkinMask(float3 c) {
  float3 hsv = FGM_RgbToHsv(c);
  float y = FGM_Luma(c);
  float hue = FGM_HueWindow(hsv.x, 4.0, 10.0, 30.0, 40.0);
  float sat = FGM_HueWindow(hsv.y, 0.12, 0.2, 0.5, 0.6);
  float light = FGM_HueWindow(y, 0.2, 0.3, 0.75, 0.86);
  return hue * sat * light;
}

float FGM_VegetationMask(float3 c) {
  float3 hsv = FGM_RgbToHsv(c);
  float y = FGM_Luma(c);
  if (y < 0.05 || y > 0.75) return 0.0;
  float hue = FGM_HueWindow(hsv.x, 70.0, 90.0, 150.0, 170.0);
  float sat = smoothstep(0.12, 0.22, hsv.y) * (1.0 - smoothstep(0.72, 0.88, hsv.y));
  return hue * sat;
}

float FGM_ProtectColorMask(float3 c) {
  float3 hsv = FGM_RgbToHsv(c);
  float y = FGM_Luma(c);
  if (y < 0.04) return 0.0;
  float red = (hsv.y > 0.45 && y > 0.08 && (hsv.x < 18.0 || hsv.x > 345.0)) ? 1.0 : 0.0;
  float veg = FGM_VegetationMask(c);
  float green = (hsv.y > 0.4 && hsv.x > 85.0 && hsv.x < 165.0 && y > 0.08 && veg < 0.35) ? 1.0 : 0.0;
  float neon = (hsv.y > 0.62 && y > 0.12 && (hsv.x < 20.0 || hsv.x > 80.0)) ? 1.0 : 0.0;
  return saturate(red + green + neon);
}

float FGM_LampMask(float3 c) {
  if (FGM_SkinMask(c) > 0.35 || FGM_ProtectColorMask(c) > 0.45) return 0.0;
  float3 hsv = FGM_RgbToHsv(c);
  float y = FGM_Luma(c);
  float warm = FGM_HueWindow(hsv.x, 24.0, 36.0, 64.0, 78.0);
  float core = smoothstep(0.5, 0.72, y) * warm * smoothstep(0.12, 0.22, hsv.y) * (1.0 - smoothstep(0.82, 0.94, hsv.y));
  float streak = smoothstep(0.18, 0.32, y) * (1.0 - smoothstep(0.8, 0.92, y));
  streak *= FGM_HueWindow(hsv.x, 30.0, 40.0, 72.0, 86.0);
  streak *= smoothstep(0.04, 0.1, hsv.y) * (1.0 - smoothstep(0.62, 0.78, hsv.y));
  return saturate(max(core, streak * 0.9));
}

float FGM_HazeMask(float3 c) {
  float3 hsv = FGM_RgbToHsv(c);
  float y = FGM_Luma(c);
  float neutral = 1.0 - smoothstep(0.045, 0.085, hsv.y);
  return neutral * smoothstep(0.42, 0.62, y);
}

float FGM_RoadMask(float3 c, float yNorm) {
  float3 hsv = FGM_RgbToHsv(c);
  float y = FGM_Luma(c);
  if (yNorm < 0.62) return 0.0;
  if (FGM_SkinMask(c) > 0.2 || FGM_VegetationMask(c) > 0.25) return 0.0;
  float gray = 1.0 - smoothstep(0.08, 0.28, hsv.y);
  float asphalt = smoothstep(0.05, 0.12, y) * (1.0 - smoothstep(0.62, 0.82, y));
  return gray * asphalt;
}

float3 FGM_ScaleAroundLuma(float3 c, float nextLuma) {
  float y = FGM_Luma(c);
  if (y < 1e-5) return nextLuma.xxx;
  return c * (nextLuma / y);
}

float3 FGM_WithSat(float3 c, float sat) {
  float3 hsv = FGM_RgbToHsv(c);
  return FGM_HsvToRgb(hsv.x, saturate(sat), hsv.z);
}

bool FGM_SceneIsDay() {
  return tex2D(FGM_SceneLumaSamp, float2(0.5, 0.5)).r >= 0.42;
}

float3 FGM_Tap(float2 texcoord, float2 offsetPx) {
  return tex2D(ReShade::BackBuffer, texcoord + offsetPx * BUFFER_PIXEL_SIZE).rgb;
}

// Pacote gráfico original FGM 2.0. Cada technique tem um trabalho só.
// A medição de dia/noite é um alvo 1x1 dentro de FGM_Exposure, não um
// full-screen pass repetido. FGM_Exposure precisa permanecer primeiro.

#include "ReShade.fxh"

texture FGM_SceneLumaTex { Width = 1; Height = 1; Format = R32F; };
sampler FGM_SceneLumaSamp { Texture = FGM_SceneLumaTex; MinFilter = POINT; MagFilter = POINT; };

#include "FGM.fxh"

texture FGM_LutTex < source = "FGM_Lut.png"; > { Format = RGBA8; };
sampler FGM_LutSamp {
  Texture = FGM_LutTex;
  AddressU = CLAMP;
  AddressV = CLAMP;
  MinFilter = LINEAR;
  MagFilter = LINEAR;
};

texture FGM_RoadTex < source = "FGM_RoadAlbedo.png"; > { Format = RGBA8; };
sampler FGM_RoadSamp {
  Texture = FGM_RoadTex;
  AddressU = REPEAT;
  AddressV = REPEAT;
  MinFilter = LINEAR;
  MagFilter = LINEAR;
};

uniform float ExposureBias < ui_type = "slider"; ui_min = -0.1; ui_max = 0.1; ui_label = "Exposição"; > = 0.02;
uniform float HighlightStart < ui_type = "slider"; ui_min = 0.5; ui_max = 1.0; ui_label = "Início do highlight"; > = 0.80;
uniform float HighlightStrength < ui_type = "slider"; ui_min = 0.0; ui_max = 1.5; ui_label = "Recuperação"; > = 0.55;
uniform float TonemapStrength < ui_type = "slider"; ui_min = 0.0; ui_max = 1.5; ui_label = "Tonemap"; > = 0.35;
uniform float ShadowLift < ui_type = "slider"; ui_min = 0.0; ui_max = 0.1; ui_label = "Sombras"; > = 0.035;
uniform float ClearDay < ui_type = "slider"; ui_min = 0.0; ui_max = 1.0; ui_label = "ClearView dia"; > = 0.58;
uniform float ClearNight < ui_type = "slider"; ui_min = 0.0; ui_max = 1.0; ui_label = "ClearView noite"; > = 0.34;
uniform int ClearTaps < ui_type = "slider"; ui_min = 0; ui_max = 8; ui_label = "Amostras ClearView"; > = 8;
uniform float LampStrength < ui_type = "slider"; ui_min = 0.0; ui_max = 1.0; ui_label = "Postes"; > = 0.90;
uniform float ReflectStrength < ui_type = "slider"; ui_min = 0.0; ui_max = 0.5; ui_label = "Reflexos"; > = 0.16;
uniform int ReflectTaps < ui_type = "slider"; ui_min = 0; ui_max = 8; ui_label = "Amostras de reflexo"; > = 8;
uniform float RoadStrength < ui_type = "slider"; ui_min = 0.0; ui_max = 1.0; ui_label = "Asfalto"; > = 0.42;
uniform float BloomThreshold < ui_type = "slider"; ui_min = 0.5; ui_max = 1.0; ui_label = "Limiar do bloom"; > = 0.86;
uniform float BloomIntensity < ui_type = "slider"; ui_min = 0.0; ui_max = 0.4; ui_label = "Bloom"; > = 0.10;
uniform int BloomTaps < ui_type = "slider"; ui_min = 0; ui_max = 12; ui_label = "Amostras de bloom"; > = 12;
uniform float DaySat < ui_type = "slider"; ui_min = 0.8; ui_max = 1.2; ui_label = "Saturação do dia"; > = 1.03;
uniform float DayHighlight < ui_type = "slider"; ui_min = 0.0; ui_max = 0.4; ui_label = "Highlight do dia"; > = 0.08;
uniform float NightLift < ui_type = "slider"; ui_min = 0.0; ui_max = 0.08; ui_label = "Piso da noite"; > = 0.018;
uniform float NightHaze < ui_type = "slider"; ui_min = 0.0; ui_max = 1.0; ui_label = "Véu noturno"; > = 0.55;
uniform float ContrastAmount < ui_type = "slider"; ui_min = 0.0; ui_max = 0.3; ui_label = "Contraste"; > = 0.03;
uniform float ColorVibrance < ui_type = "slider"; ui_min = 0.8; ui_max = 1.3; ui_label = "Vibrance"; > = 1.03;
uniform float ColorVegCap < ui_type = "slider"; ui_min = 1.0; ui_max = 1.2; ui_label = "Teto da vegetação"; > = 1.035;
uniform float LutMix < ui_type = "slider"; ui_min = 0.0; ui_max = 1.0; ui_label = "LUT"; > = 0.72;
uniform float AmbientDay < ui_type = "slider"; ui_min = 0.0; ui_max = 0.1; ui_label = "Ambiente dia"; > = 0.025;
uniform float AmbientNight < ui_type = "slider"; ui_min = 0.0; ui_max = 0.1; ui_label = "Ambiente noite"; > = 0.03;
uniform float ProtectCeiling < ui_type = "slider"; ui_min = 0.8; ui_max = 1.0; ui_label = "Teto"; > = 0.96;
uniform float SharpAmount < ui_type = "slider"; ui_min = 0.0; ui_max = 0.5; ui_label = "Nitidez"; > = 0.16;
uniform float VignetteAmount < ui_type = "slider"; ui_min = 0.0; ui_max = 0.4; ui_label = "Vinheta"; > = 0.12;
uniform float GrainAmount < ui_type = "slider"; ui_min = 0.0; ui_max = 0.05; ui_label = "Grão"; > = 0.0;
uniform float ChromaAmount < ui_type = "slider"; ui_min = 0.0; ui_max = 1.5; ui_label = "Aberração"; > = 0.0;
uniform float RainAmount < ui_type = "slider"; ui_min = 0.0; ui_max = 1.0; ui_label = "Chuva"; > = 0.0;
uniform float RainDrops < ui_type = "slider"; ui_min = 0.0; ui_max = 1.0; ui_label = "Gotas"; > = 0.0;

static const float2 FGM_CLEAR_TAPS[8] = {
  float2(1, 0), float2(-1, 0), float2(0, 1), float2(0, -1),
  float2(1, 1), float2(-1, 1), float2(1, -1), float2(-1, -1)
};

static const float2 FGM_BLOOM_TAPS[12] = {
  float2(0, 0), float2(1.2, 0.4), float2(-1.1, 0.5), float2(0.4, 1.3),
  float2(-0.5, -1.2), float2(2.1, 0.8), float2(-2.0, 0.7), float2(0.8, -2.1),
  float2(-0.9, 2.0), float2(2.6, -1.4), float2(-2.5, -1.5), float2(0.2, 2.7)
};

float4 PS_Measure(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float acc = 0.0;
  [unroll]
  for (int y = 0; y < 4; y++) {
    [unroll]
    for (int x = 0; x < 4; x++) {
      float2 uv = float2((x + 0.5) / 4.0, (y + 0.5) / 4.0);
      acc += FGM_Luma(tex2D(ReShade::BackBuffer, uv).rgb);
    }
  }
  return float4(acc / 16.0, 0.0, 0.0, 1.0);
}

float3 PS_Exposure(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  if (abs(ExposureBias) < 1e-5) return c;
  return c * (1.0 + ExposureBias);
}

float3 PS_Highlight(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  float y = FGM_Luma(c);
  if (y <= HighlightStart) return c;
  float t = (y - HighlightStart) / max(1e-4, 1.0 - HighlightStart);
  float compressed = HighlightStart + (1.0 - HighlightStart) * (t / (1.0 + t * HighlightStrength));
  return FGM_ScaleAroundLuma(c, compressed);
}

float3 PS_Tonemap(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  float y = FGM_Luma(c);
  if (y <= 0.84) return c;
  float mapped = 0.84 + (y - 0.84) / (1.0 + (y - 0.84) * TonemapStrength);
  return FGM_ScaleAroundLuma(c, mapped);
}

float3 PS_Shadows(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  float y = FGM_Luma(c);
  if (y >= 0.35 || ShadowLift <= 0.0) return c;
  float lift = (1.0 - smoothstep(0.02, 0.35, y)) * ShadowLift;
  return c + lift;
}

float3 PS_Clear(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 center = tex2D(ReShade::BackBuffer, texcoord).rgb;
  float amount = FGM_SceneIsDay() ? ClearDay : ClearNight;
  if (amount <= 0.0 || ClearTaps <= 0) return center;
  float3 acc = 0.0;
  float used = 0.0;
  [unroll]
  for (int i = 0; i < 8; i++) {
    float w = i < ClearTaps ? 1.0 : 0.0;
    acc += FGM_Tap(texcoord, FGM_CLEAR_TAPS[i] * 2.0) * w;
    used += w;
  }
  float3 avg = acc / max(used, 1.0);
  float yv = FGM_Luma(center);
  float local = FGM_Luma(avg);
  float haze = FGM_HazeMask(center);
  float delta = yv - local;
  float next = yv;
  if (delta < -0.01) next = yv + delta * amount * 0.45;
  else if (abs(delta) <= 0.02 && haze > 0.55) next = yv - haze * amount * 0.045;
  next = min(yv + 0.008, max(0.0, next));
  return FGM_ScaleAroundLuma(center, saturate(next));
}

float3 PS_Lamps(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  float mask = FGM_LampMask(c) * LampStrength;
  if (mask <= 0.0) return c;
  float y = FGM_Luma(c);
  return lerp(c, y.xxx, mask);
}

float3 PS_Reflect(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  if (ReflectStrength <= 0.0 || ReflectTaps <= 0 || texcoord.y < 0.55) return c;
  if (FGM_RoadMask(c, texcoord.y) < 0.4) return c;
  float3 acc = 0.0;
  float used = 0.0;
  [unroll]
  for (int t = 0; t < 8; t++) {
    float w = t < ReflectTaps ? 1.0 : 0.0;
    float2 offset = float2(t - ReflectTaps * 0.5, -6.0 - t);
    acc += FGM_Tap(texcoord, offset) * w;
    used += w;
  }
  float3 src = acc / max(used, 1.0);
  float srcY = FGM_Luma(src);
  if (srcY < 0.45) return c;
  return saturate(c + src * (ReflectStrength * (srcY - 0.45)));
}

float3 PS_Road(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  float mask = FGM_RoadMask(c, texcoord.y);
  if (RoadStrength <= 0.0 || mask < 0.25) return c;
  float2 size;
  FGM_RoadTex.GetDimensions(size.x, size.y);
  float2 pixel = floor(texcoord * BUFFER_SCREEN_SIZE);
  float2 uv = (fmod(pixel, size) + 0.5) / size;
  float3 asphalt = tex2D(FGM_RoadSamp, uv).rgb;
  float detail = FGM_Luma(asphalt) / FGM_ROAD_LUMA_SCALE;
  float factor = lerp(1.0, 0.86 + detail * 0.28, RoadStrength * mask);
  return saturate(c * factor);
}

float3 PS_Bloom(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  if (BloomIntensity <= 0.0 || BloomTaps <= 0) return c;
  float3 acc = 0.0;
  float used = 0.0;
  [unroll]
  for (int i = 0; i < 12; i++) {
    float w = i < BloomTaps ? 1.0 : 0.0;
    float3 s = FGM_Tap(texcoord, FGM_BLOOM_TAPS[i]);
    float weight = max(0.0, FGM_Luma(s) - BloomThreshold);
    acc += s * weight * w;
    used += w;
  }
  float taps = max(used, 1.0);
  return c + (acc / taps) * (BloomIntensity / taps);
}

float3 PS_Day(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  if (!FGM_SceneIsDay()) return c;
  float skin = FGM_SkinMask(c);
  float protect = FGM_ProtectColorMask(c);
  float y = FGM_Luma(c);
  float3 rgb = c;
  if (skin < 0.4 && protect < 0.4 && DaySat != 1.0) {
    float3 hsv = FGM_RgbToHsv(c);
    float veg = FGM_VegetationMask(c);
    float next = min(0.66, hsv.y * DaySat);
    if (veg > 0.4) next = min(next, hsv.y * 1.03);
    if (skin > 0.0) next = lerp(next, hsv.y, skin);
    rgb = FGM_WithSat(c, next);
  }
  if (y > 0.84) {
    float pulled = lerp(y, 0.9, DayHighlight * smoothstep(0.84, 0.98, y));
    rgb = FGM_ScaleAroundLuma(rgb, min(y, pulled));
  }
  return rgb;
}

float3 PS_Night(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  if (FGM_SceneIsDay()) return c;
  float y = FGM_Luma(c);
  float3 rgb = c;
  if (y < 0.12) {
    float lifted = max(y, lerp(y, NightLift, 0.65));
    rgb += (lifted - y);
  }
  float haze = FGM_HazeMask(rgb);
  float y2 = FGM_Luma(rgb);
  if (haze > 0.0 && y2 > 0.32) {
    float next = y2 * (1.0 - haze * NightHaze * 0.55);
    rgb = FGM_ScaleAroundLuma(rgb, max(0.02, next));
  }
  return rgb;
}

float3 PS_Contrast(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  if (ContrastAmount <= 0.0 || FGM_SkinMask(c) > 0.55) return c;
  float y = FGM_Luma(c);
  float curved = saturate((y - 0.5) * (1.0 + ContrastAmount) + 0.5);
  return FGM_ScaleAroundLuma(c, curved);
}

float3 PS_Color(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  float skin = FGM_SkinMask(c);
  float protect = FGM_ProtectColorMask(c);
  if (skin > 0.45 || protect > 0.45 || ColorVibrance == 1.0) return c;
  float veg = FGM_VegetationMask(c);
  float3 hsv = FGM_RgbToHsv(c);
  float next = hsv.y * ColorVibrance;
  if (veg > 0.4) next = min(next, hsv.y * ColorVegCap);
  next = min(next, 0.68);
  if (skin > 0.0) next = lerp(next, hsv.y, skin);
  return FGM_WithSat(c, next);
}

float3 PS_Lut(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  if (LutMix <= 0.0) return c;
  float blue = c.b * 31.0;
  float b0 = floor(blue);
  float b1 = min(31.0, b0 + 1.0);
  float f = blue - b0;
  float y = (c.g * 31.0 + 0.5) / 32.0;
  float2 uv0 = float2((b0 * 32.0 + c.r * 31.0 + 0.5) / 1024.0, y);
  float2 uv1 = float2((b1 * 32.0 + c.r * 31.0 + 0.5) / 1024.0, y);
  float3 graded = lerp(tex2D(FGM_LutSamp, uv0).rgb, tex2D(FGM_LutSamp, uv1).rgb, f);
  return lerp(c, graded, LutMix);
}

float3 PS_Ambient(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  bool day = FGM_SceneIsDay();
  float amount = day ? AmbientDay : AmbientNight;
  if (amount <= 0.0 || FGM_SkinMask(c) > 0.3 || FGM_ProtectColorMask(c) > 0.3) return c;
  float y = FGM_Luma(c);
  if (y > 0.55) return c;
  float shadow = 1.0 - smoothstep(0.15, 0.55, y);
  if (day) return float3(c.r + amount * shadow * 0.4, c.g + amount * shadow * 0.28, c.b);
  return float3(c.r, c.g + amount * shadow * 0.15, c.b + amount * shadow * 0.45);
}

float3 PS_Protect(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  float skin = FGM_SkinMask(c);
  float3 rgb = c;
  if (skin > 0.25) {
    float3 hsv = FGM_RgbToHsv(c);
    float sat = lerp(hsv.y, saturate(min(hsv.y, 0.52)), skin);
    float hue = (hsv.x < 6.0 || hsv.x > 50.0) ? lerp(hsv.x, 22.0, skin * 0.35) : hsv.x;
    rgb = FGM_HsvToRgb(hue, sat, hsv.z);
  }
  float y = FGM_Luma(rgb);
  if (y > ProtectCeiling) rgb = FGM_ScaleAroundLuma(rgb, ProtectCeiling);
  float3 hsv2 = FGM_RgbToHsv(rgb);
  if (hsv2.y < 0.06 && y > 0.72) {
    float neutral = y;
    rgb = lerp(neutral.xxx, rgb, 0.35);
    if (FGM_Luma(rgb) > ProtectCeiling) rgb = FGM_ScaleAroundLuma(rgb, ProtectCeiling);
  }
  return saturate(rgb);
}

float3 PS_Sharp(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  if (SharpAmount <= 0.0) return c;
  float3 n0 = FGM_Tap(texcoord, float2(1, 0));
  float3 n1 = FGM_Tap(texcoord, float2(-1, 0));
  float3 n2 = FGM_Tap(texcoord, float2(0, 1));
  float3 n3 = FGM_Tap(texcoord, float2(0, -1));
  float3 blur = (n0 + n1 + n2 + n3) * 0.25;
  float3 detail = c - blur;
  float edge = abs(FGM_Luma(detail));
  float gain = SharpAmount * (1.0 - smoothstep(0.08, 0.28, edge));
  float3 next = c + detail * gain;
  float neighborMax = max(FGM_Luma(n0), max(FGM_Luma(n1), max(FGM_Luma(n2), FGM_Luma(n3))));
  float cap = neighborMax + 0.03;
  float yv = FGM_Luma(next);
  return yv > cap ? FGM_ScaleAroundLuma(next, cap) : next;
}

float3 PS_Vignette(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  if (VignetteAmount <= 0.0 || FGM_Luma(c) > 0.7) return c;
  float2 p = texcoord * 2.0 - 1.0;
  float d = min(1.0, length(p));
  float dark = smoothstep(0.72, 1.2, d) * VignetteAmount;
  return c * (1.0 - dark);
}

float3 PS_Grain(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  if (GrainAmount <= 0.0) return c;
  float n = frac(sin(dot(floor(texcoord * BUFFER_SCREEN_SIZE), float2(12.9898, 78.233))) * 43758.5453);
  float g = (n - 0.5) * GrainAmount;
  return saturate(c + g);
}

float3 PS_Chroma(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  if (ChromaAmount <= 0.0) return c;
  float2 offset = BUFFER_PIXEL_SIZE * ChromaAmount;
  float r = tex2D(ReShade::BackBuffer, texcoord + offset).r;
  float b = tex2D(ReShade::BackBuffer, texcoord - offset).b;
  return float3(r, c.g, b);
}

float3 PS_Rain(float4 pos : SV_Position, float2 texcoord : TEXCOORD) : SV_Target {
  float3 c = tex2D(ReShade::BackBuffer, texcoord).rgb;
  float amount = RainAmount * RainDrops;
  if (amount <= 0.0) return c;
  float2 pixel = floor(texcoord * BUFFER_SCREEN_SIZE);
  float travel = pixel.y + Timer * 0.28;
  float column = floor(pixel.x + travel * 0.08);
  float drop = frac(sin(column * 127.1 + floor(travel * 0.5) * 311.7) * 43758.5453);
  if (drop < 0.92) return c;
  float size = 0.5 + frac(sin(column * 13.7) * 43758.5453);
  float edge = frac(sin(dot(pixel, float2(19.1, 7.7))) * 43758.5453);
  float delta = amount * 0.035 * size * (0.45 + edge * 0.55);
  float2 shift = BUFFER_PIXEL_SIZE * float2(0.35, 0.8) * size;
  float3 refract = tex2D(ReShade::BackBuffer, texcoord + shift).rgb;
  float3 mixed = lerp(c, refract, 0.25);
  return saturate(mixed + float3(delta * 0.85, delta * 0.9, delta));
}

technique FGM_Exposure {
  pass Measure {
    VertexShader = PostProcessVS;
    PixelShader = PS_Measure;
    RenderTarget = FGM_SceneLumaTex;
  }
  pass Apply {
    VertexShader = PostProcessVS;
    PixelShader = PS_Exposure;
  }
}

technique FGM_HighlightRecovery { pass { VertexShader = PostProcessVS; PixelShader = PS_Highlight; } }
technique FGM_Tonemap { pass { VertexShader = PostProcessVS; PixelShader = PS_Tonemap; } }
technique FGM_Shadows { pass { VertexShader = PostProcessVS; PixelShader = PS_Shadows; } }
technique FGM_ClearView { pass { VertexShader = PostProcessVS; PixelShader = PS_Clear; } }
technique FGM_Lamps { pass { VertexShader = PostProcessVS; PixelShader = PS_Lamps; } }
technique FGM_ReflectionsEnhance { pass { VertexShader = PostProcessVS; PixelShader = PS_Reflect; } }
technique FGM_Road { pass { VertexShader = PostProcessVS; PixelShader = PS_Road; } }
technique FGM_Bloom { pass { VertexShader = PostProcessVS; PixelShader = PS_Bloom; } }
technique FGM_Day { pass { VertexShader = PostProcessVS; PixelShader = PS_Day; } }
technique FGM_Night { pass { VertexShader = PostProcessVS; PixelShader = PS_Night; } }
technique FGM_Contrast { pass { VertexShader = PostProcessVS; PixelShader = PS_Contrast; } }
technique FGM_Color { pass { VertexShader = PostProcessVS; PixelShader = PS_Color; } }
technique FGM_Lut { pass { VertexShader = PostProcessVS; PixelShader = PS_Lut; } }
technique FGM_AmbientTone { pass { VertexShader = PostProcessVS; PixelShader = PS_Ambient; } }
technique FGM_ColorProtection { pass { VertexShader = PostProcessVS; PixelShader = PS_Protect; } }
technique FGM_Sharp { pass { VertexShader = PostProcessVS; PixelShader = PS_Sharp; } }
technique FGM_Vignette { pass { VertexShader = PostProcessVS; PixelShader = PS_Vignette; } }
technique FGM_FilmGrain { pass { VertexShader = PostProcessVS; PixelShader = PS_Grain; } }
technique FGM_ChromaticAberration { pass { VertexShader = PostProcessVS; PixelShader = PS_Chroma; } }
technique FGM_Rain { pass { VertexShader = PostProcessVS; PixelShader = PS_Rain; } }

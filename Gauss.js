var GaussUtil = (function () {
// 保存 Math 函数名和属性
var pow = Math.pow,
    sqrt = Math.sqrt,
    sin = Math.sin,
    cos = Math.cos,
    tan = Math.tan,
    abs = Math.abs,
    floor = Math.floor,
    ceil = Math.ceil,
    pi = Math.PI;
// WGS84椭球参数
var a = 6378137,
    b = 6356752.3142,
    f = a / (a - b),
    // 第一偏心率
    e = (2 * f - 1) / pow(f, 2),
    e2 = pow(e, 2),
    e3 = pow(e, 3),
    e4 = pow(e, 4),
    e5 = pow(e, 5),
    // 第二偏心率
    e_2 = e / (1 - e);
// 计算子午线弧长公式的系数
var cA = 1 + 3 * e / 4 + 45 * e2 / 64 + 175 * e3 / 256 + 11025 * e4 / 16384,
    cB = 3 * e / 4 + 15 * e2 / 16 + 525 * e3 / 512 + 2205 * e4 / 2048,
    cC = 15 * e2 / 64 + 105 * e3 / 256 + 2205 * e4 / 4096,
    cD = 35 * e3 / 512 + 315 * e4 / 2048,
    cE = 315 * e4 / 16384;
// 和带号处理相关的参数
var zoneMask = 1000000;
var offsetValue = 500000;

// 根据高斯平面坐标计算经纬度坐标
// 注意：这里的 x, y 坐标是测量坐标系下的纵轴和横轴坐标，与
// 通常意义上的平面坐标有区别。
// @x 纵轴坐标，如  3215242.42
// @y 横轴坐标，如 38540123.52
// @return <object>: { lat: <number>, lon: <number> }
function calcLatLonFromGauss(x, y) {
    var zoneNum = floor(y / zoneMask);
    var L0 = calcCentralMeridian(zoneNum);
    if (!L0) {
        return null;
    }
    // 整理横轴坐标：去带号，去偏移量
    y = y % zoneMask - offsetValue;
    // 计算底点 F 的纬度 Bf，这是计算最终结果非常重要的参数
    var Bf = calcBf(x, y);
    // 计算最终结果时需要的参数，保存会多次使用的值
    var cosBf = cos(Bf),
        cosBf2 = pow(cosBf, 2),
        tanBf = tan(Bf),
        tanBf2 = pow(tanBf, 2),
        tanBf4 = pow(tanBf, 4),
        Nf = a / sqrt(1 - e * pow(sin(Bf), 2)),
        y_Nf = y / Nf,
        V2 = 1 + e_2 * cosBf2, // tf/Mf
        nf2 = e_2 * cosBf2;
    // 非常复杂的计算方法，尽量不要改动
    // 计算公式可参考：《大地坐标系统及其应用》p188下（8-90）
    var B = Bf - V2 * tanBf / 2 * (pow(y_Nf, 2) - (5 + 3 * tanBf2 + nf2 - 9 * nf2 * tanBf2) * pow(y_Nf, 4) / 12 + (61 + 90 * tanBf2 + 45 * tanBf4) * pow(y_Nf, 6) / 360);
    var l = (y_Nf - (1 + 2 * tanBf2 + nf2) *  pow(y_Nf, 3) / 6 + (5 + 28 * tanBf2 + 24 * tanBf4 + 6 * nf2 + 8 * nf2 * tanBf2) * pow(y_Nf, 5) / 120) / cosBf;
    B = B * 180 / pi;
    l = l * 180 / pi;
    return {
        lon: l + L0,
        lat: B,
        longitude: l + L0,
        latitude: B
    };
}

function calcGaussFromLatLon(B, L, zoneType)
{
    zoneType = zoneType || 6;
    var zoneNum = calcZoneNum(L, zoneType);
    if (!zoneNum) {
        return null;
    }
    L -= zoneNum * zoneType - (zoneType == 6 ? 3 : 0);

    // 角度转换弧度
    var rB = B * pi / 180,
        tB = tan(rB),
        tB2 = pow(tB, 2),
        X = cos(rB) * L * pi / 180,
        N = a / sqrt(1 - e * sin(rB) * sin(rB)),
        it2 = e_2 * pow(cos(rB), 2);
    var x = X * X / 2 + (5 - tB2 + 9 * it2 + 4 * it2 * it2) * pow(X, 4) / 24 + (61 - 58 * tB2 + pow(tB, 4)) * pow(X, 6) / 720;
    x = calcMeridianLength(B) + N * tB * x;
    var y = N * (X +  (1 - tB2 + it2) * pow(X, 3) / 6 + (5 - 18 * tB2 + pow(tB, 4) + 14 * it2 - 58 * tB2 * it2) * pow(X, 5) / 120);
    // 横轴坐标换算为常见格式：平移，加带号
    y += zoneNum * zoneMask + offsetValue;
    return {
        x: x,
        y: y,
        e: y, // 东坐标
        n: x  // 北坐标
    };
}
// 根据纬度计算子午线弧长
function calcMeridianLength(B)
{
    // 将度转化为弧度
    var rB = B * pi / 180;
    return a * (1 - e) * 
        (cA * rB - 
         cB * sin(2 * rB) / 2 + 
         cC * sin(4 * rB) / 4 - 
         cD * sin(6 * rB) / 6 + 
         cE * sin(8 * rB) / 8);
}

// 根据带号和分带类型计算中央子午线经度
// @zoneNum 带号
// @type 分带类型，3/6，可选，未提供时根据中国范围带号合理推测
function calcCentralMeridian(zoneNum, zoneType) {
    zoneType = zoneType || calcZoneType(zoneNum);
    // 中国范围内带号，6度分带：13-21,3度分带：23-45
    if (zoneNum >= 13 && zoneNum <= 45 && (zoneType === 3 || zoneType === 6)) {
        return zoneType === 3 ? 3 * zoneNum : 6 * zoneNum - 3;
    } else {
        return null;
    }
}

// 根据中国范围内合理的 3度和 6度带号，推测分带类型
function calcZoneType(zoneNum) {
    if (zoneNum <= 23) {
        return 6;
    }
    if (zoneNum >= 25) {
        return 3;
    }
    return null;
}

// 根据经度值、分带类型计算带号
function calcZoneNum(lon, zoneType) {
    if (lon > 0 && lon < 180 && zoneType && (zoneType === 3 || zoneType === 6)) {
        return zoneType === 3 ? ceil((lon - 1.5) / 3) : ceil(lon / 6);
    } else {
        return null;
    }
}

// 计算底点纬度 Bf
function calcBf(x, y) {
    var LIMIT_VALUE = 0.00000000001;
    var lastBf, Bf = x / (a * (1 - e) * cA);
    do {
        lastBf = Bf;
        Bf = (x + a * (1 - e) * (cB * sin(2 * Bf) / 2 - cC * sin(4 * Bf) / 4 + cD * sin(6 * Bf) / 6) - cE * sin(8 * Bf) / 8) / (a * (1 - e) * cA);
    }
    while (abs(lastBf - Bf) > LIMIT_VALUE);
    return Bf;
}

// API
return {
    toLatLon: calcLatLonFromGauss,
    fromLatLon: calcGaussFromLatLon
};
}());

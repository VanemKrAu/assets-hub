// 河南电信 IPTV —— mytv-android JS 动态源
// 用法：m3u 里写成 javascript://http://47.122.111.152/hn.js?name=CCTV1
// 脚本在电视上执行，直接用你家网络请求河南电信接口，所以永远是最新的频道地址

var API = "http://dx-live.hnnrtv.com:32766/live/channelListVer";
var CACHE = "hn_channels_v1.json";
var TTL = 15 * 60 * 1000; // 频道表缓存 15 分钟

var BODY = JSON.stringify({
    siteCode: "telecomS",
    mac: "585FF6273B05",
    userName: "837012161053@HAITV",
    deviceType: "STB",
    tokenCode: "837012161053@HAITV_585FF6273B05",
    appKey: "appKey",
    groupingID: "",
    cdn: "1",
    packageName: "com.hndxrm.dxlauncher",
    version: "111",
    versionName: "V3.ZX.2.05",
    brand: "Androidhuawei",
    model: "3.0",
    licence: "3"
});

// 常见标准名 → 接口里的中文名
var ALIAS = {
    "CCTV1": "中央一套", "CCTV2": "中央二套", "CCTV3": "中央三套", "CCTV4": "中央四套",
    "CCTV5": "中央五套", "CCTV6": "中央六套", "CCTV7": "中央七套", "CCTV8": "中央八套",
    "CCTV9": "中央九套", "CCTV10": "中央十套", "CCTV11": "中央十一套", "CCTV12": "中央十二套",
    "CCTV13": "中央新闻", "CCTV14": "中央少儿", "CCTV15": "中央音乐",
    "CCTV16": "中央十六套", "CCTV17": "中央十七套", "CCTV16 4K": "CCTV16-4K",
    "CCTV 4K": "CCTV-4K", "CCTV4K": "CCTV-4K"
};

function _parse(str) {
    var o = {};
    if (!str) return o;
    var arr = String(str).split("&");
    for (var i = 0; i < arr.length; i++) {
        var kv = arr[i];
        if (!kv) continue;
        var p = kv.indexOf("=");
        if (p < 0) continue;
        var k = kv.substring(0, p), v = kv.substring(p + 1);
        try { k = decodeURIComponent(k); } catch (e) {}
        try { v = decodeURIComponent(v); } catch (e) {}
        o[k] = v;
    }
    return o;
}

function _fetchTable() {
    var cached = "", cachedOk = false, fresh = false;
    try { cached = mytv.readFile(CACHE) || ""; } catch (e) { cached = ""; }
    cachedOk = cached.indexOf('"channelList"') > 0;
    try { fresh = mytv.fileExists(CACHE, TTL); } catch (e) { fresh = false; }
    if (cachedOk && fresh) return cached;          // 缓存新鲜，直接用
    var raw = "";
    try {
        raw = mytv.post(API, ["Content-Type: application/json"], BODY) || "";
    } catch (e) { raw = ""; }
    if (raw.indexOf('"channelList"') > 0) {        // 拉到了新表，写入缓存
        try { mytv.writeFile(CACHE, raw); } catch (e) {}
        return raw;
    }
    if (cachedOk) return cached;                   // 拉不到就退回旧表，别让整个列表黑掉
    return "";
}

function main(item) {
    var p = _parse(item || "");
    var name = (p.name || p.n || "").trim();
    if (!name) return JSON.stringify({ error: "缺少 name 参数" });

    var raw;
    try {
        raw = _fetchTable();
    } catch (e) {
        return JSON.stringify({ error: "请求上游失败: " + e });
    }
    if (!raw) return JSON.stringify({ error: "上游无响应" });

    var list = [];
    try {
        var obj = JSON.parse(raw);
        if (obj.rtCode !== "S") return JSON.stringify({ error: "上游返回 " + obj.rtCode });
        list = obj.data.channelList || [];
    } catch (e) {
        return JSON.stringify({ error: "解析失败" });
    }

    var want = ALIAS[name] || name;
    var best = null;
    for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (!c || c.name !== want) continue;
        var u = c.uAddress || "";
        if (u.indexOf("http") !== 0) continue;   // 过滤 "null1" 这类脏数据
        if (!best) { best = c; }
    }
    if (!best) return JSON.stringify({ error: "找不到频道: " + name });

    var url = best.uAddress;
    if (url.indexOf("http") !== 0) return JSON.stringify({ error: "该频道没有可用地址" });
    return JSON.stringify({ url: url });
}

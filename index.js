const { scrapGempaTerkini } = require("./controllers/gempaterkini.controller")
const { scrapGempaDirasakan } = require("./controllers/gempadirasakan.controller")
const { scrapGempaRealtime } = require("./controllers/gemparealtime.controller")
const { setIntervalFix } = require("./libs/utils")

setIntervalFix(scrapGempaTerkini,3*60*1000)
setIntervalFix(scrapGempaDirasakan,2*60*1000)
setIntervalFix(scrapGempaRealtime,4*60*1000)
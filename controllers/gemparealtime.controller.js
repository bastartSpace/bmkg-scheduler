const { DB_URL, DB_NAME } = require("../config/db");
const { MongoClient } = require("mongodb");
const { getDiffRight, fetch } = require("../libs/utils")
const { JSDOM } = require('jsdom')
const { setIntervalFix } = require("../libs/utils")

const mongoClient = new MongoClient(DB_URL);
const COLLECTION = 'gemparealtime'

let tempData = []
const sourceUrl = 'https://bmkg.go.id/gempabumi/gempabumi-realtime.bmkg'
const sourceTag = 'scrap-web'

exports.scrapGempaRealtime = async () => {
    const html = await fetch(sourceUrl)
    const dom = new JSDOM(html)
    const document = dom.window.document
    const table = document.querySelectorAll('body > div.wrapper > div.container.content > div > div.col-md-8 > div > div.table-responsive > table > tbody > tr')
    const dataGempa = []
    for (const element of table) {
        const data = {}
        data.datetime = element.querySelector('td:nth-child(2)').textContent
        data.lintang = Number(element.querySelector('td:nth-child(3)').textContent)
        data.bujur = Number(element.querySelector('td:nth-child(4)').textContent)
        data.magnitudo = Number(element.querySelector('td:nth-child(5)').textContent.replace('M', ''))
        data.kedalaman = Number(element.querySelector('td:nth-child(6)').textContent)
        data.wilayah = element.querySelector('td:nth-child(7)').textContent
        const { href } = element.querySelector('td:nth-child(7) > a')
        data.detailurl = href
        data.sourceTag = sourceTag
        data.sourceUrl = sourceUrl
        dataGempa.push(data)
    }
    const filteredData = getDiffRight(dataGempa, tempData)
    try {
        if (tempData.length > 0)
            filteredData.forEach(element => {
                saveData(formatDataGempa(element))
            });
        // for the first time server run
        else
            saveMultiData(filteredData)
        console.log('done insert')
    } catch (error) {
        console.log('some data cannot be save', error)
    } finally {
        tempData = dataGempa
    }
    return filteredData
}

const saveData = async (data) => {
    try {
        const database = mongoClient.db(DB_NAME);
        const gempaCollection = database.collection(COLLECTION);
        await gempaCollection.insertOne(data)
    } catch (error) {
        console.log('error insert to DB', error)
    }
}

const saveMultiData = async (data) => {
    const bulkData = [];
    try {
        const database = mongoClient.db(DB_NAME);
        const gempaCollection = database.collection(COLLECTION);
        data.forEach((x) => {
            bulkData.push({
                updateOne: {
                    filter: x,
                    update: { $set: x },
                    upsert: true
                }
            });
        });
        await gempaCollection.bulkWrite(bulkData);
    } catch (error) {
        console.log('error insert to DB', error)
    }
}



const formatDataGempa = (data) => {
    return { ...data, sourceTag: sourceTag, sourceUrl: sourceUrl }
}
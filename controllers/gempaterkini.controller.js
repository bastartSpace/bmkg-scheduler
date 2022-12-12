const { DB_URL, DB_NAME } = require("../config/db");
const { MongoClient } = require("mongodb");
const { getDiffLeft, fetch } = require("../libs/utils")
const { JSDOM } = require('jsdom')

const mongoClient = new MongoClient(DB_URL);
const COLLECTION = 'gempaterkini'

let tempData = []
const sourceUrl = 'https://bmkg.go.id/gempabumi-terkini.html'
const sourceTag = 'scrap-web'

exports.scrapGempaTerkini = async () => {
    const html = await fetch(sourceUrl)
    const dom = new JSDOM(html)
    const document = dom.window.document
    const table = document.querySelectorAll('body > div.wrapper > div.container.content > div > div.col-md-8 > div > div > table > tbody > tr')
    const dataGempa = []
    for (const element of table) {
        const data = {}
        data.datetime = element.querySelector('td:nth-child(2)').textContent
        data.lintang = Number(element.querySelector('td:nth-child(3)').textContent)
        data.bujur = Number(element.querySelector('td:nth-child(4)').textContent)
        data.magnitudo = Number(element.querySelector('td:nth-child(5)').textContent)
        data.kedalaman = element.querySelector('td:nth-child(6)').textContent
        data.wilayah = element.querySelector('td:nth-child(7)').textContent
        dataGempa.push(data)
    }
    const filteredData = getDiffLeft(dataGempa, tempData)
    try {
        if (tempData.length > 0)
            filteredData.forEach(element => {
                saveData(formatDataGempa(element))
            });
        // for the first time server run
        else
            filteredData.forEach(element => {
                saveDataWithCheck(formatDataGempa(element))
            });
    } catch (error) {
        console.log('some data cannot be save', error)
    } finally {
        tempData = dataGempa
    }
    return filteredData

}

const saveData = (data) => {
    try {
        const database = mongoClient.db(DB_NAME);
        const gempaCollection = database.collection(COLLECTION);
        gempaCollection.insertOne(data)
    } catch (error) {
        console.log('error insert to DB', error)
    }
}
const saveDataWithCheck = async (data) => {
    try {
        const database = mongoClient.db(DB_NAME);
        const gempaCollection = database.collection(COLLECTION);
        const result = await gempaCollection.findOne(data)
        if (!result) gempaCollection.insertOne(data)
    } catch (error) {
        console.log('error insert to DB', error)
    }
}

const formatDataGempa = (data) => {
    return {...data, sourceTag: sourceTag, sourceUrl: sourceUrl}
}
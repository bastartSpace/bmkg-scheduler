const { DB_URL, DB_NAME } = require("../config/db");
const { MongoClient } = require("mongodb");
const { getDiffRight, fetch } = require("../libs/utils")
const { JSDOM } = require('jsdom')

const mongoClient = new MongoClient(DB_URL);
const COLLECTION = 'gempadirasakan'

let tempData = []
const sourceUrl = 'https://bmkg.go.id/gempabumi-dirasakan.html'
const sourceTag = 'scrap-web'

exports.scrapGempaDirasakan = async () => {
    const html = await fetch(sourceUrl)
    const dom = new JSDOM(html)
    const document = dom.window.document
    const table = document.querySelectorAll('body > div.wrapper > div.container.content > div > div.col-md-8 > div > div > table > tbody > tr')
    const dataGempa = []
    for (const element of table) {
        const data = {}
        data.datetime = element.querySelector('td:nth-child(2)').textContent
        data.lintang_bujur = element.querySelector('td:nth-child(3)').textContent
        data.magnitudo = Number(element.querySelector('td:nth-child(4)').textContent)
        data.kedalaman = element.querySelector('td:nth-child(5)').textContent
        data.wilayah = element.querySelector('td:nth-child(6) > a').textContent
        const dirasakan = element.querySelectorAll('td:nth-child(6) > span')
        const locations = []
        for (const lokasi of dirasakan) {
            locations.push(lokasi.textContent.replace('\t',' '))
        }
        data.dirasakan = locations
        const {id} = element.querySelector('td:nth-child(6) > div')
        data.shakemap = `https://ews.bmkg.go.id/TEWS/data/${id}.mmi.jpg`
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
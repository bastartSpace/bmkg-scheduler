const { DB_URL, DB_NAME } = require("../config/db");
const { MongoClient } = require("mongodb");
const { getDiffLeft, fetch } = require("../libs/utils")
const { JSDOM } = require('jsdom')

const mongoClient = new MongoClient(DB_URL);
const COLLECTION = 'cuacaprovinsi'

let tempData = []
const sourceUrl = 'https://www.bmkg.go.id/cuaca/prakiraan-cuaca-indonesia.bmkg'
const sourceTag = 'scrap-web'

exports.scrapCuacaProvinsi = async () => {
    const html = await fetch(sourceUrl)
    const dom = new JSDOM(html)
    const document = dom.window.document
    const htmlListProvinsi = document.querySelectorAll('body > div.wrapper > div.container.content > div > div.col-md-8.margin-bottom-20 > div > div.row.list-cuaca-provinsi.md-margin-bottom-10 > div > a')
    const dataCuaca = []
    const listLinkProvinsi = []
    for (const element of htmlListProvinsi) {
        listLinkProvinsi.push(element.href)
    }
    for (const key in listLinkProvinsi) {
        if (key > 20) continue
        const html = await fetch(sourceUrl + listLinkProvinsi[key])
        const dom = new JSDOM(html)
        const document = dom.window.document
        const htmlDayTab = document.querySelectorAll('body > div.wrapper > div.container.content > div > div.col-md-8.margin-bottom-20 > div > ul > li > a')
        const currentDay = document.querySelector('body > div.wrapper > div.header-v8.header-sticky > div.blog-topbar > div.container > div > div.col-sm-4.col-xs-12 > div.topbar-time.hari-digit.hidden-xs').textContent
        const provName = document.querySelector('body > div.wrapper > div.container.content > div > div.col-md-8.margin-bottom-20 > h2').textContent

        const prediksi_cuaca = []
        for (const element of htmlDayTab) {
            const tanggal = element.textContent
            const cuacakota = []
            const href = element.href.split('#')
            const table = document.getElementById(href[href.length - 1])
            const firstRowHtml = table.querySelector('div.table-responsive > table > tbody:nth-child(1) > tr')

            const firstRowData = templateFetch(table, firstRowHtml)
            cuacakota.push(firstRowData)

            const restRowHtml = table.querySelectorAll('div.table-responsive > table > tbody:nth-child(3) > tr')
            for (const row of restRowHtml) {
                cuacakota.push(templateFetch(table, row))
            }

            prediksi_cuaca.push({
                tanggal: tanggal,
                cuacakota: cuacakota
            })
        }
        dataCuaca.push({ current_day: currentDay, provinsi: provName, prediksi_cuaca: prediksi_cuaca, sourceUrl: sourceUrl, sourceTag: sourceTag })
    }
    const filteredData = getDiffLeft(dataCuaca, tempData)
    try {
        saveMultiData(filteredData)
    } catch (error) {
        console.log('some data cannot be save', error)
    } finally {
        tempData = dataCuaca
    }
    return filteredData

}

const templateFetch = (table, row) => {
    const firstRowData = {}
    firstRowData.kota = row.querySelector('td:nth-child(1)').textContent
    firstRowData.detailurl = 'https://www.bmkg.go.id/cuaca/' + row.querySelector('td:nth-child(1) > a').href
    firstRowData.suhu = row.querySelector('td:nth-last-child(2)').textContent
    firstRowData.kelembapan = row.querySelector('td:nth-last-child(1)').textContent

    const header = table.querySelectorAll('tr:nth-child(2) > th')
    header.forEach((element, i) => {
        firstRowData['cuaca_' + element.textContent.toLowerCase().replace(' ', '')] = {
            image_cuaca: row.querySelector(`td:nth-child(${i + 2}) > img`).src,
            teks_cuaca: row.querySelector(`td:nth-child(${i + 2}) > span`).textContent
        }
    });
    return firstRowData
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
                    update: { $set: { ...x, update_timestamp_utc: Date.now() } },
                    upsert: true
                }
            });
        });
        if (bulkData.length > 0) await gempaCollection.bulkWrite(bulkData);
    } catch (error) {
        console.log('error insert to DB', error)
    }
}
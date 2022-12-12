const axios = require("axios");

exports.fetch = (url) => {
    return axios
        .get(url,{ 
            headers: { "Accept-Encoding": "gzip,deflate,compress" } 
        })
        .then((response) => {
            return response.data
        })
        .catch((error) => {
            console.error(error)
        });
}

exports.getDiffLeft = (arrA, arrB) => {
    return arrA.filter((x, i) => {
        const test = arrB.findIndex(y => {
            for (const key in y) {
                if (JSON.stringify(x[key]) !== JSON.stringify(y[key])) {
                    return false
                }
            }
            return true
        })
        return test === -1
    });
}

function setIntervalFix(fn, ms) {
    fn().catch((e) => {
        console.error(e);
    }).finally(() => {
        setTimeout(() => setIntervalFix(fn, ms), ms);
    });
};

exports.setIntervalFix = setIntervalFix
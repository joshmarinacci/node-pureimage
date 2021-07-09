// const convert = require('xml-js');
// const axios = require('axios');

// Onset" https://forecast.weather.gov/MapClick.php?lat=41.7476&lon=-70.6676&FcstType=digitalDWML
// NOLA   https://forecast.weather.gov/MapClick.php?lat=29.9537&lon=-90.0777&FcstType=digitalDWML

// New data source : https://www.weather.gov/documentation/services-web-api
// Not all data is present

export class WeatherData {
    lat = "";
    lon = "";
    rainScaleFactor = 1000; // Rain at .2 in/hr will be scaled to 100 (full range)
    weatherJson = null; //
    constructor() {
    }

    // time                     "2019-07-08T17:00:00-04:00" weatherJson.dwml.data.time-layout.start-valid-time[i]._text
    // hourly temp              "72"                        weatherJson.dwml.data.parameters.temperature[2].value[i]._text
    // dew point                "58"                        weatherJson.dwml.data.parameters.temperature[0].value[i]._text
    // heat index               "72"                        weatherJson.dwml.data.parameters.temperature[1].value[i]._text
    // cloud cover              "0" - "100"                 weatherJson.dwml.data.parameters.cloud-amount.value[i]._text
    // prob of precip           "0" - "100"                 weatherJson.dwml.data.parameters.probability-of-precipitation.value[i]._text
    // humidity                 "42"                        weatherJson.dwml.data.parameters.humidity.value[i]._text
    // wind speed  sustained    "4"                         weatherJson.dwml.data.parameters.wind-speed[0].value[i]._text
    // wind speed  gust         ???                         weatherJson.dwml.data.parameters.wind-speed[1].value[i]._text
    // direction (degrees true) "0" - "359"                 weatherJson.dwml.data.parameters.direction.value[i]._text
    // QPF (amount of rain)     "0.0100"                    weatherJson.dwml.data.parameters.hourly-qpf.value[i]._text
    //
    // One data point per hour.
    // for heat index, no index if weatherJson.dwml.data.parameters.temperature[1].value[i]._attributes["xsi:nil"] == "true"
    // for wind gusts, no gusts if weatherJson.dwml.data.parameters.wind-speed[1].value[i]._attributes["xsi:nil"] == "true"

    timeString (index) {return this.weatherJson.dwml.data["time-layout"]["start-valid-time"][index]._text};
    temperature(index) {return this.weatherJson.dwml.data.parameters.temperature[2].value[index]._text};
    dewPoint   (index) {return this.weatherJson.dwml.data.parameters.temperature[0].value[index]._text};
    cloudCover (index) {return this.weatherJson.dwml.data.parameters["cloud-amount"].value[index]._text};
    precipProb (index) {return this.weatherJson.dwml.data.parameters["probability-of-precipitation"].value[index]._text};
    windSpeed  (index) {return this.weatherJson.dwml.data.parameters["wind-speed"][0].value[index]._text};
    precipAmt  (index) {return this.weatherJson.dwml.data.parameters["hourly-qpf"].value[index]._text};

    async getWeatherData(jsondata) {
        this.weatherJson = jsondata.weatherJson
        for (let i = 0; i < 120; i++) {
            if (this.weatherJson.dwml.data.parameters["hourly-qpf"].value[i].hasOwnProperty("_text") === true) {
                this.weatherJson.dwml.data.parameters["hourly-qpf"].value[i]._text
                    = Math.min(this.weatherJson.dwml.data.parameters["hourly-qpf"].value[i]._text * this.rainScaleFactor, 100);
            } else {
                this.weatherJson.dwml.data.parameters["hourly-qpf"].value[i]._text = "0.0";
            }
        }

        return true;
    }
}

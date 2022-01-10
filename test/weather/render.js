import chai, {expect} from 'chai';
import os from 'os';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as pure from '../../src/index.ts';
import fs from 'fs';
import path from 'path';
import {WeatherData} from './weatherdata.js';

async function render() {
    let wData = new WeatherData();
    let raw_data = await fs.promises.readFile('data.json');
    await wData.getWeatherData(JSON.parse(raw_data.toString()));

    const imageHeight = 1080; // 800;
    const imageWidth = 1920; // 1280;

    // Screen origin is the upper left corner
    const chartOriginX = 100;                    // In from the left edge
    const chartOriginY = imageHeight - 70;       // Down from the top (Was: Up from the bottom edge)

    const topLegendLeftIndent = imageWidth - 300;

    // The chartWidth will be smaller than the imageWidth but must be a multiple of hoursToShow
    // The chartHeight will be smaller than the imageHeight but must be a multiple of 100
    const chartWidth = 1680; // 1080;
    const chartHeight = 900; // 600;

    const daysToShow = 5;//weatherRequest.days;                       // for 5 days (valid is 1..6)

    const showHourGridLines = daysToShow <= 2 ? true : false;    // Only show if we are showing 2 days or less, otherwise its too crowded

    const hoursToShow = daysToShow * 24;                         //   120

    const verticalFineGridLines = daysToShow * 24;                //   120        every 1 hours  (0-20 for 21 total vertical lines)
    const verticalGridLines = daysToShow * 4;                    //   20        every 6 hours  (0-20 for 21 total vertical lines)
    const verticalMajorGridLines = daysToShow;                         //   4         every 4th vertical lines is a day

    const verticalFineGridSpacing = chartWidth / verticalFineGridLines; // horizontal spacing between the vertical lines. 1080 pixels split into 20 chunks
    const verticalGridSpacing = chartWidth / verticalGridLines;         // horizontal spacing between the vertical lines. 1080 pixels split into 20 chunks
    const verticalMajorGridSpacing = chartWidth / verticalMajorGridLines;   // horizontal spacing between the vertical lines. 1080 pixels split into 20 chunks

    const pointsPerHour = chartWidth / hoursToShow;

    const fullScaleDegrees = 100;
    const horizontalGridLines = fullScaleDegrees / 10;             // The full scale is devided into a grid of 10. Each represents 10 degrees, percent or miles per hour
    const horizontalGridSpacing = chartHeight / horizontalGridLines;  // vertical spacing between the horizontal lines. 900 pixels split into 10 chunks
    const pointsPerDegree = chartHeight / 100;

    const sunOriginX = 100;
    const sunOriginY = chartOriginY - chartHeight - 8;

    const moonOriginX = 100;
    const moonOriginY = chartOriginY - chartHeight - 16;

    const largeFont = "48px 'OpenSans-Bold'";   // Title
    const mediumFont = "36px 'OpenSans-Bold'";   // axis labels
    const smallFont = "24px 'OpenSans-Bold'";   // Legend at the top

    const fontDir = '.';
    const fntBold = pure.registerFont(path.join(fontDir, 'OpenSans-Bold.ttf'), 'OpenSans-Bold');
    const fntRegular = pure.registerFont(path.join(fontDir , '/OpenSans-Regular.ttf'), 'OpenSans-Regular');
    const fntRegular2 = pure.registerFont(path.join(fontDir, '/alata-regular.ttf'), 'alata-regular');

    fntBold.loadSync();
    fntRegular.loadSync();
    fntRegular2.loadSync();

    const thinStroke = 1;
    const regularStroke = 3;
    const heavyStroke = 5;

    const backgroundColor = 'rgb(0, 0, 30)';
    const titleColor = 'white';
    const gridLinesColor = 'rgb(100, 100, 100)';
    const majorGridLinesColor = 'rgb(150, 150, 150)';
    const temperatureColor = 'rgb(255, 40, 40)';
    const dewPointColor = 'rgb(140, 240, 0)';
    const windSpeedColor = 'yellow';

    const img = pure.make(imageWidth, imageHeight);
    const ctx = img.getContext('2d');

    // Canvas reference
    // origin is upper right
    // coordinates are x, y, width, height in that order
    // to set a color: ctx.fillStyle = 'rgb(255, 255, 0)'
    //                 ctx.fillStyle = 'Red'
    //                 ctx.setFillColor(r, g, b, a);
    //                 ctx.strokeStyle = 'rgb(100, 100, 100)';


    // Fill the bitmap
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, imageWidth, imageHeight);

    // Draw the title
    ctx.fillStyle = titleColor;
    ctx.font = largeFont;
    let title = 'Forecast for Onset, MA';
    const textWidth = ctx.measureText(title).width;
    ctx.fillText(title, (imageWidth - textWidth) / 2, 60);

    // Draw the color key labels
    ctx.font = smallFont;

    ctx.fillStyle = temperatureColor;
    ctx.fillText('Temperature', topLegendLeftIndent, 30);

    ctx.fillStyle = dewPointColor;
    ctx.fillText('Dew Point', topLegendLeftIndent, 60);

    ctx.fillStyle = windSpeedColor;
    ctx.fillText('Wind Speed', topLegendLeftIndent, 90);

    let startX;
    let startY;
    let endX;
    let endY;

    // We need to skip past the time that has past today.  Start at current hour.
    const firstHour = new Date().getHours(); // 0-23
    // this.logger.info("First Hour: " + firstHour);

    //
    // Draw the cloud cover in the background (filled)
    //
    ctx.fillStyle = 'rgb(50, 50, 50)';

    // if there are 120 hours to show, and first hour is 0
    // we want to access wData in the range 0-119
    // since each iteration uses i and i+1, we want to loop from 0-118
    //
    // if we start 10 hours into the day, we will loop from 0-109
    // We do start plotting the data firstHour * pointsPerHour after the y axis
    for (let i = 0; i < (hoursToShow - firstHour - 1); i++) {
        startX = chartOriginX + (i + firstHour) * pointsPerHour;
        endX = chartOriginX + (i + firstHour + 1) * pointsPerHour;
        startY = chartOriginY - wData.cloudCover(i) * pointsPerDegree;
        endY = chartOriginY - wData.cloudCover(i + 1) * pointsPerDegree;

        // console.log("Cover: [" + i + "] = " + " StartX: " + startX + " EndX: " + endX);

        ctx.beginPath();
        ctx.moveTo(startX, chartOriginY);          // Start at bottom left
        ctx.lineTo(startX, startY);     // Up to the height of startY
        ctx.lineTo(endX, endY);         // across the top to endY
        ctx.lineTo(endX, chartOriginY);            // down to the bottom right
        ctx.lineTo(startX, chartOriginY);          // back to the bottom left
        ctx.fill();
    }

    startX = chartOriginX + (hoursToShow - 1) * pointsPerHour;
    endX = chartOriginX + (hoursToShow) * pointsPerHour;
    startY = chartOriginY - wData.cloudCover(hoursToShow - 1) * pointsPerDegree;
    endY = chartOriginY - wData.cloudCover(hoursToShow) * pointsPerDegree;

    ctx.beginPath();
    ctx.moveTo(startX, chartOriginY);          // Start at bottom left
    ctx.lineTo(startX, startY);     // Up to the height of startY
    ctx.lineTo(endX, endY);         // across the top to endY
    ctx.lineTo(endX, chartOriginY);            // down to the bottom right
    ctx.lineTo(startX, chartOriginY);          // back to the bottom left
    ctx.fill();

    //
    // Draw the probability of precipitation at the bottom.  The rain amount will cover part of this up.
    //
    ctx.fillStyle = 'rgb(40, 60, 100)';  // A little more blue

    // if there are 120 hours to show, and first hour is 0
    // we want to access wData in the range 0-119
    // since each iteration uses i and i+1, we want to loop from 0-118
    //
    // if we start 10 hours into the day, we will loop from 0-109
    // We do start plotting the data firstHour * pointsPerHour after the y axis
    for (let i = 0; i < (hoursToShow - firstHour - 1); i++) {
        startX = chartOriginX + (i + firstHour) * pointsPerHour;
        endX = chartOriginX + (i + firstHour + 1) * pointsPerHour;
        startY = chartOriginY - wData.precipProb(i) * pointsPerDegree;
        endY = chartOriginY - wData.precipProb(i + 1) * pointsPerDegree;

        // this.logger.info("Cover: [" + i + "] = " + " StartX: " + startX + " Precip: " + wData.precipAmt(i) + " Y1: " + (chartOriginY - startY) + " Y2: " + (chartOriginY - endY));

        ctx.beginPath();
        ctx.moveTo(startX, chartOriginY);          // Start at bottom left
        ctx.lineTo(startX, startY);     // Up to the height of startY
        ctx.lineTo(endX, endY);         // across the top to endY
        ctx.lineTo(endX, chartOriginY);            // down to the bottom right
        ctx.lineTo(startX, chartOriginY);          // back to the bottom left
        ctx.fill();
    }

    //
    // Draw the rain amount in the background over the clouds (filled)
    //
    ctx.fillStyle = 'rgb(40, 130, 150)';  // A little more blue

    // if there are 120 hours to show, and first hour is 0
    // we want to access wData in the range 0-119
    // since each iteration uses i and i+1, we want to loop from 0-118
    //
    // if we start 10 hours into the day, we will loop from 0-109
    // We do start plotting the data firstHour * pointsPerHour after the y axis
    for (let i = 0; i < (hoursToShow - firstHour - 1); i++) {
        startX = chartOriginX + (i + firstHour) * pointsPerHour;
        endX = chartOriginX + (i + firstHour + 1) * pointsPerHour;
        startY = chartOriginY - wData.precipAmt(i) * pointsPerDegree;
        endY = chartOriginY - wData.precipAmt(i + 1) * pointsPerDegree;

        // this.logger.info("Cover: [" + i + "] = " + " StartX: " + startX + " Precip: " + wData.precipAmt(i) + " Y1: " + (chartOriginY - startY) + " Y2: " + (chartOriginY - endY));

        ctx.beginPath();
        ctx.moveTo(startX, chartOriginY);          // Start at bottom left
        ctx.lineTo(startX, startY);     // Up to the height of startY
        ctx.lineTo(endX, endY);         // across the top to endY
        ctx.lineTo(endX, chartOriginY);            // down to the bottom right
        ctx.lineTo(startX, chartOriginY);          // back to the bottom left
        ctx.fill();
    }

    startX = chartOriginX + (hoursToShow - 1) * pointsPerHour;
    endX = chartOriginX + (hoursToShow) * pointsPerHour;
    startY = chartOriginY - wData.precipAmt(hoursToShow - 1) * pointsPerDegree;
    endY = chartOriginY - wData.precipAmt(hoursToShow) * pointsPerDegree;

    ctx.beginPath();
    ctx.moveTo(startX, chartOriginY);          // Start at bottom left
    ctx.lineTo(startX, startY);     // Up to the height of startY
    ctx.lineTo(endX, endY);         // across the top to endY
    ctx.lineTo(endX, chartOriginY);            // down to the bottom right
    ctx.lineTo(startX, chartOriginY);          // back to the bottom left
    ctx.fill();

    // Draw the grid lines

    // Draw the thin hour vertical lines
    if (showHourGridLines) {
        ctx.strokeStyle = gridLinesColor;
        ctx.lineWidth = thinStroke;
        for (let i = 0; i <= verticalFineGridLines; i++) {
            startX = chartOriginX + (i * verticalFineGridSpacing);
            endX = chartOriginX + (i * verticalFineGridSpacing);
            startY = chartOriginY;
            endY = chartOriginY - (chartHeight);

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }

    // Draw the regular vertical lines
    ctx.strokeStyle = gridLinesColor;
    ctx.lineWidth = regularStroke;
    for (let i = 0; i <= verticalGridLines; i++) {
        startX = chartOriginX + (i * verticalGridSpacing);
        endX = chartOriginX + (i * verticalGridSpacing);
        startY = chartOriginY;
        endY = chartOriginY - (chartHeight);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    // Draw the major vertical lines
    ctx.strokeStyle = majorGridLinesColor;
    ctx.lineWidth = heavyStroke;
    for (let i = 0; i <= verticalGridLines; i++) {
        startX = chartOriginX + (i * verticalMajorGridSpacing);
        endX = chartOriginX + (i * verticalMajorGridSpacing);
        startY = chartOriginY;
        endY = chartOriginY - (chartHeight);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    // Draw the horizontal lines
    ctx.strokeStyle = gridLinesColor;
    ctx.lineWidth = regularStroke;
    for (let i = 0; i <= horizontalGridLines; i++) {
        startX = chartOriginX;
        endX = chartOriginX + chartWidth;
        startY = chartOriginY - (i * horizontalGridSpacing);
        endY = chartOriginY - (i * horizontalGridSpacing);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    // Draw the major horizontal lines (typically at 0 and 100)
    ctx.strokeStyle = majorGridLinesColor;
    ctx.lineWidth = heavyStroke;
    for (let i = 0; i <= 1; i++) {
        startX = chartOriginX;
        endX = chartOriginX + chartWidth;
        startY = chartOriginY - (i * chartHeight);
        endY = chartOriginY - (i * chartHeight);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    // Draw an orange line at 75 degrees
    ctx.strokeStyle = 'orange';
    startX = chartOriginX;
    endX = chartOriginX + chartWidth;
    startY = chartOriginY - (horizontalGridSpacing * 75) / 10;
    endY = chartOriginY - (horizontalGridSpacing * 75) / 10;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw an blue line at 32 degrees
    ctx.strokeStyle = 'rgb(0, 0, 200)';
    startX = chartOriginX;
    endX = chartOriginX + chartWidth;
    startY = chartOriginY - (horizontalGridSpacing * 32) / 10;
    endY = chartOriginY - (horizontalGridSpacing * 32) / 10;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw the axis labels
    ctx.font = mediumFont;
    ctx.fillStyle = 'rgb(200, 200, 200)';

    for (let i = 0; i <= horizontalGridLines; i++) {
        // i = 0, 1 ..10    labelString = "0", "10" .. "100"
        const labelString = (i * (fullScaleDegrees / horizontalGridLines)).toString();

        const labelStringWdth = ctx.measureText(labelString).width;
        const x = chartOriginX - 50;
        const y = chartOriginY + 10 - (i * horizontalGridSpacing);
        ctx.fillText(labelString, x - labelStringWdth / 2, y);
    }

    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < (hoursToShow / 24); i++) {
        const date = new Date(Date.parse(wData.timeString(i * 24)));
        const dayStr = weekday[date.getDay()];
        const dayStrWdth = ctx.measureText(dayStr).width;


        const x = chartOriginX + (i * 4 + 2) * verticalGridSpacing;
        const y = chartOriginY + 40;

        ctx.fillText(dayStr, x - dayStrWdth / 2, y);
    }

    ctx.lineWidth = heavyStroke;

    // Draw the temperature line
    ctx.strokeStyle = temperatureColor;
    ctx.beginPath();
    ctx.moveTo(chartOriginX + pointsPerHour * firstHour, chartOriginY - (wData.temperature(0) * chartHeight) / fullScaleDegrees);

    for (let i = 0; i <= (hoursToShow - firstHour - 1); i++) {
        ctx.lineTo(chartOriginX + pointsPerHour * (i + firstHour), chartOriginY - (wData.temperature(i) * chartHeight) / fullScaleDegrees);
    }
    ctx.lineTo(chartOriginX + pointsPerHour * hoursToShow, chartOriginY - (wData.temperature(hoursToShow - firstHour) * chartHeight) / fullScaleDegrees);
    ctx.stroke();

    // Draw the dew point line
    ctx.strokeStyle = dewPointColor;
    ctx.beginPath();
    ctx.moveTo(chartOriginX + pointsPerHour * firstHour, chartOriginY - (wData.dewPoint(0) * chartHeight) / fullScaleDegrees);
    for (let i = 0; i <= (hoursToShow - firstHour - 1); i++) {
        ctx.lineTo(chartOriginX + pointsPerHour * (i + firstHour), chartOriginY - (wData.dewPoint(i) * chartHeight) / fullScaleDegrees);
    }
    ctx.lineTo(chartOriginX + pointsPerHour * hoursToShow, chartOriginY - (wData.dewPoint(hoursToShow - firstHour) * chartHeight) / fullScaleDegrees);
    ctx.stroke();

    // Draw the wind speed line
    ctx.strokeStyle = windSpeedColor;
    ctx.beginPath();
    ctx.moveTo(chartOriginX + pointsPerHour * firstHour, chartOriginY - (wData.windSpeed(0) * chartHeight) / fullScaleDegrees);
    for (let i = 0; i <= (hoursToShow - firstHour - 1); i++) {
        ctx.lineTo(chartOriginX + pointsPerHour * (i + firstHour), chartOriginY - (wData.windSpeed(i) * chartHeight) / fullScaleDegrees);
    }
    ctx.lineTo(chartOriginX + pointsPerHour * hoursToShow, chartOriginY - (wData.windSpeed(hoursToShow - firstHour) * chartHeight) / fullScaleDegrees);
    ctx.stroke();

    await pure.encodePNGToStream(img, fs.createWriteStream('foo.png'));
    console.log('wrote it out to foo.png');
}

render().then(()=>console.log('we are done')).catch(e => console.error(e));

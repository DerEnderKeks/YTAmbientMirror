// ==UserScript==
// @name         Youtube Ambient Mirror
// @namespace    ytambientmirror
// @version      0.0.1
// @description  Ambient video for the Youtube video player
// @author       DerEnderKeks
// @website      https://github.com/DerEnderKeks/YTAmbientMirror
// @supportURL   https://github.com/DerEnderKeks/YTAmbientMirror/issues
// @updateURL    https://github.com/DerEnderKeks/YTAmbientMirror/raw/master/ytambientmirror.user.js
// @downloadURL  https://github.com/DerEnderKeks/YTAmbientMirror/raw/master/ytambientmirror.user.js
// @include      https://www.youtube.com/watch*
// @include      https://www.youtube.com/embed/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

var blurRadius = '15px';
var updateDelay = 50;

var videoElements = document.getElementsByTagName('video');
var ambientElements = [];
var videoMap = [];

Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
    get: function(){
        return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
    }
})

function updateAmbientVideo(video, context, w, h) {
    if (video.paused || video.ended) return false;
    context.filter = `blur(${blurRadius})`;
    context.drawImage(video, 0, 0, w, h);
    setTimeout(updateAmbientVideo, updateDelay, video, context, w, h);
}

var getAmbient = (videoElement) => {
    for (var i = 0; i < videoMap.length; i++) {
        if (!videoMap[i] || videoMap[i][0] != videoElement) continue;
        return videoMap[i][1];
    }
}

var getContext = (ambientElement) => {
    for (var i = 0; i < ambientElements.length; i++) {
        if (!ambientElements[i] || ambientElements[i][0] != ambientElement) continue;
        return ambientElements[i][1];
    }
}

var getCanvasSizes = (canvasElement) => {
    return [canvasElement.clientWidth, canvasElement.clientHeight]
}

var videoEventListener = (event) => {
    var ambientElement = getAmbient(event.target);
    var context = getContext(ambientElement)
    updateAmbientVideo(event.target, context, getCanvasSizes(ambientElement)[0], getCanvasSizes(ambientElement)[1]);
}

var addAmbientCanvas = (videoElement) => {
    if (!(videoElement instanceof HTMLElement)) return;
    var ambientElement = document.createElement('canvas')
    videoElement.parentElement.insertBefore(ambientElement, videoElement);
    ambientElement.style.width = '100%';
    ambientElement.style.height = videoElement.style.height;

    var context = ambientElement.getContext('2d');
    context.filter = `blur(${blurRadius})`;
    ambientElement.width = getCanvasSizes(ambientElement)[0];
    ambientElement.height = getCanvasSizes(ambientElement)[1];
    ambientElements.push([ambientElement, context]);
    videoMap.push([videoElement, ambientElement]);

    videoElement.addEventListener('play', videoEventListener, false);
    context.drawImage(videoElement, 0, 0, ambientElement.width, ambientElement.height);
}

var apply = () => {
    if (GM_getValue('ambientEnabled', true)) {
        for (var i = 0; i < videoElements.length; i++) {
            if (!videoElements[i]) continue;
            addAmbientCanvas(videoElements[i]);
            if (videoElements[i].playing) {
                var ambientElement = getAmbient(videoElements[i]);
                var context = getContext(ambientElement)
                updateAmbientVideo(videoElements[i], context, getCanvasSizes(ambientElement)[0], getCanvasSizes(ambientElement)[1]);
            }
        }
    } else {
        for (var i = 0; i < videoElements.length; i++) {
            if (!videoElements[i]) continue;
            videoElements[i].removeEventListener('play', videoEventListener);
        }
        for (var j = 0; j < ambientElements.length; j++) {
            if (!ambientElements[j]) continue;
            ambientElements[j][0].outerHTML = '';
        }
        ambientElements = [];
        videoMap = [];
    }
}

document.addEventListener('keypress', (event) => {
    if (event.code === 'KeyW') {
        GM_setValue('ambientEnabled', !GM_getValue('ambientEnabled', true));
        apply();
        console.log(`Toogled ambient video ${GM_getValue('ambientEnabled', true) ? 'on' : 'off'}`);
    }
});

apply();

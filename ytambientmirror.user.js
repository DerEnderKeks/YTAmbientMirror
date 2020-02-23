// ==UserScript==
// @name         Youtube Ambient Mirror
// @namespace    ytambientmirror
// @version      0.0.8
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

let blurRadius = '15px';

let videoElements = document.getElementsByTagName('video');
let ambientElementMap = new Map();
let videoMap = new Map();
let videoObserverMap = new Map();

Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
    get: function() {
        return !!(!this.paused && !this.ended && this.readyState > 2);
    }
})

const updateAmbientVideo = (video, context) => {
    if (video.paused || video.ended) return false;
    let ambientElement = videoMap.get(video);
    context.filter = `blur(${blurRadius})`;
    context.drawImage(video, 0, 0, getCanvasSizes(ambientElement)[0], getCanvasSizes(ambientElement)[1]);
    requestAnimationFrame(() => {
        updateAmbientVideo(video, context);
    });
}

const getAmbient = (videoElement) => {
    return videoMap.get(videoElement);
}

const getContext = (ambientElement) => {
    return ambientElementMap.get(ambientElement);
}

const getCanvasSizes = (canvasElement) => {
    return [canvasElement.clientWidth, canvasElement.clientHeight]
}

const videoPlayEventListener = (event) => {
    let ambientElement = getAmbient(event.target);
    ambientElement.style.display = 'block';
    let context = getContext(ambientElement);
    updateAmbientVideo(event.target, context);
}

const videoEndedEventListener = (event) => {
    if (!GM_getValue('ambientEnabled', true)) return;
    let ambientElement = getAmbient(event.target);
    ambientElement.style.display = 'none';
}

const updateCanvasSize = (videoElement) => {
    let ambientElement = videoMap.get(videoElement);
    ambientElement.style.height = Math.abs(Math.ceil(parseInt(videoElement.style.height, 10) + (2 * parseInt(videoElement.style.top, 10)))) + 'px';
    ambientElement.width = getCanvasSizes(ambientElement)[0];
    ambientElement.height = getCanvasSizes(ambientElement)[1];
}

const addResizeObserver = (videoElement) => {
    let lastState = Object.assign({}, videoElement.style);
    let config = {attributes: true};
    let callback = (mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type == 'attributes' && (lastState.height !== videoElement.style.height || lastState.width !== videoElement.style.width)) {
                lastState = Object.assign({}, videoElement.style);
                updateCanvasSize(videoElement);
            }
        }
    };
    videoObserverMap.set(videoElement, new MutationObserver(callback));
    videoObserverMap.get(videoElement).observe(videoElement, config);
}

const addAmbientCanvas = (videoElement) => {
    if (!(videoElement instanceof HTMLElement)) return;
    let ambientElement = document.createElement('canvas')
    videoElement.parentElement.insertBefore(ambientElement, videoElement);
    videoMap.set(videoElement, ambientElement);
    ambientElement.style.width = '100%';
    updateCanvasSize(videoElement);

    let context = ambientElement.getContext('2d');
    context.filter = `blur(${blurRadius})`;
    ambientElementMap.set(ambientElement, context);
    addResizeObserver(videoElement);

    videoElement.addEventListener('play', videoPlayEventListener, false);
    videoElement.addEventListener('ended', videoEndedEventListener, false);
    context.drawImage(videoElement, 0, 0, getCanvasSizes(ambientElement)[0], getCanvasSizes(ambientElement)[1]);
}

const install = (videoElement) => {
    addAmbientCanvas(videoElement);
    if (videoElement.playing) {
        let ambientElement = getAmbient(videoElement);
        let context = getContext(ambientElement);
        updateAmbientVideo(videoElement, context);
    }
}

const uninstall = () => {
    for (let videoElement of videoElements) {
        videoElement.removeEventListener('play', videoPlayEventListener);
        videoElement.removeEventListener('play', videoEndedEventListener);
        if (videoObserverMap.get(videoElement)) videoObserverMap.get(videoElement).disconnect();
    }
    for (let ambientElement of ambientElementMap.keys()) {
        ambientElement.outerHTML = '';
    }
    ambientElementMap = new Map();
    videoMap = new Map();
    videoObserverMap = new Map();
}

const apply = () => {
    if (GM_getValue('ambientEnabled', true)) {
        for (let videoElement of videoElements) {
            install(videoElement);
        }
    } else {
        uninstall();
    }
}

document.addEventListener('keypress', (event) => {
    if (event.key === 'w') {
        GM_setValue('ambientEnabled', !GM_getValue('ambientEnabled', true));
        apply();
        console.log(`Toogled ambient video ${GM_getValue('ambientEnabled', true) ? 'on' : 'off'}`);
    }
});

window.addEventListener("load", () => {
    if (!GM_getValue('ambientEnabled', true)) return;
    const delayedFunction = (event) => {
        install(event.target);
        event.target.removeEventListener('loadeddata', delayedFunction);
    }
    for (let videoElement of videoElements) {
        if (videoElement.playing) {
            install(videoElement);
        } else {
            videoElement.addEventListener('loadeddata', delayedFunction);
        }
    }
})

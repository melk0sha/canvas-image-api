/* eslint-disable no-param-reassign */
/* eslint-disable no-constant-condition */
import "../styles/scss/style.scss";

const currentInput = document.getElementById('current-color');
const prevInput = document.getElementById('prev-color');
const canvas = document.getElementById('canvas');
const loadButton = document.querySelector('.load');
const inputSearchButton = document.querySelector('.search');
const blackAndWhiteButton = document.querySelector('.black-and-white');
const clearButton = document.querySelector('.clear');
const ctx = canvas.getContext('2d');
let colors = [currentInput.value, prevInput.value];
let radio = '.draw-128x128';
let radioBtn = document.querySelector(radio);
let haveImg = false;
let previousPosition = null;
getCanvasResolution(128);

if (localStorage.getItem('colors') === null) {
    localStorage.setItem('colors', JSON.stringify(colors));
} else {
    colors = JSON.parse(localStorage.getItem('colors'));
    [currentInput.value] = [colors[0]];
    [prevInput.value] = [colors[1]];
}

if (localStorage.getItem('canvasSize') !== null) {
    canvas.height = JSON.parse(localStorage.getItem('canvasSize'));
    canvas.width = JSON.parse(localStorage.getItem('canvasSize'));
    radio = JSON.parse(localStorage.getItem('radio'));
    radioBtn = document.querySelector(radio);
    radioBtn.checked = true;
    const dataURL = localStorage.getItem('canvas');
    const img = new Image;
    img.src = dataURL;
    img.onload = () => {
        ctx.drawImage(img, 0, 0);
    };
}

let draw = false;
const tools = document.querySelector('.tools');
const changeColor = document.querySelector('.change-color');
const radioButtons = document.querySelector('.switch');

initCurrentTool();

const login = document.querySelector('.login');
const username = document.querySelector('.username');
login.addEventListener('click', (e) => {
    e.preventDefault();
    const authenticator = new netlify.default ({});
    authenticator.authenticate({provider: "github", scope: "user"}, (err, data) => {
        if (err) {
            username.innerText = "Error Authenticating with GitHub: " + err;
        } else {
            login.style.display = 'none';
            const clientId = '8e4bb976cdb7ed9baf11';
            const clientSecret = '04311cff4d1626a091a619bfc742648e042b1e6a';
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = `https://api.github.com/user?client_id=${clientId}&client_secret=${clientSecret}&access_token=${data.token}`;
            const params = {
                method: 'GET',
                withCredentials: true,
                // mode: 'no-cors',
                credentials: 'same-origin',
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            };
            fetch(proxyUrl + targetUrl, params)
                .then((res) => res.json())
                .then((data) => {
                    username.style.display = 'unset';
                    username.innerText = data.login;
                });
        }
    });
});

function initCurrentTool() {
    const toolClass = localStorage.getItem('currentTool');
    let toolElement = null;
    if (toolClass) {
        toolElement = document.querySelector('.' + toolClass);

    } else {
        toolElement = document.querySelector('.pencil');
    }
    toolElement.classList.add('active');
    isActiveTool();
}

function getCanvasResolution(resolution) {
    canvas.width = resolution;
    canvas.height = resolution;
}

function getCursorPosition(event) {
    const x = event.offsetX;
    const y = event.offsetY;
    return [x, y];
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function fillBucket(position) {
    const x = position[0];
    const y = position[1];
    
    const targetColorArr = ctx.getImageData(Math.floor(x / (512 / canvas.height)), Math.floor(y / (512 / canvas.width)), 1, 1).data;
    const targetColor = rgbToHex(targetColorArr[0], targetColorArr[1], targetColorArr[2]);

    [ctx.fillStyle] = [colors[0]];
    if (targetColor === colors[0]) return;
    
    function floodFill(x, y) {
        const newPointColorArray = ctx.getImageData(x, y, 1, 1).data;
        const newPointColor = rgbToHex(newPointColorArray[0], newPointColorArray[1], newPointColorArray[2]);
        if (targetColor !== newPointColor) return;
    
        ctx.fillRect(x, y, 1, 1);
        if (x > 0) {
            floodFill(x - 1, y);
        }
        if (y > 0) {
            floodFill(x, y - 1);
        }
        if (x < 512) {
            floodFill(x + 1, y);
        }
        if (y < 512) {
            floodFill(x, y + 1);
        }
    }
    
    floodFill(Math.floor(x / (512 / canvas.height)), Math.floor(y / (512 / canvas.width)));
}

function chooseColor(position) {
    const x = position[0];
    const y = position[1];
    const color = ctx.getImageData(Math.floor(x / (512 / canvas.height)), Math.floor(y / (512 / canvas.width)), 1, 1).data;
    const newColor = rgbToHex(color[0], color[1], color[2]);
    if (newColor !== colors[0]) {
        currentInput.value = newColor;
        [prevInput.value] = [colors[0]];
        colors[0] = newColor;
        colors[1] = prevInput.value;
    }
}

function pencil(position) {
    let x = position[0];
    let y = position[1];

    x = Math.floor(x / (512 / canvas.height));
    y = Math.floor(y / (512 / canvas.width));
    [ctx.fillStyle] = [colors[0]];
    ctx.fillRect(x, y, 1, 1);
}

function line(position1, position2) {
    let x0 = position1[0];
    let y0 = position1[1];
    const x1 = position2[0];
    const y1 = position2[1];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    while (true) {
        pencil([x0, y0]);
        if ((x0 === x1) && (y0 === y1)) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
}

function saveCurrentTool() {
    const toolElements = document.querySelector('.tools');
    [...toolElements.children].forEach((tool) => {
        if (tool.classList.contains('active')) {
            localStorage.setItem('currentTool', tool.classList[0]);
        }
    });
}

function changeInputColor() {
    [colors[1]] = [colors[0]];
    [prevInput.value] = [colors[1]];
    colors[0] = currentInput.value;
    localStorage.setItem('colors', JSON.stringify(colors));
}

function changeColors(event) {
    let currentButton = event.target;
    if (currentButton.tagName === 'LABEL') {
        currentButton = currentButton.previousSibling;
    } else if (currentButton.tagName === 'LI') {
        [currentButton] = [[...currentButton.children][0]];
    }
    if (currentButton.id === 'current-color') {
        currentButton.click();
    } else if (currentButton.id === 'prev-color') {
        [prevInput.value] = [colors[0]];
        [colors[0]] = [colors[1]];
        [currentInput.value] = [colors[1]];
        colors[1] = prevInput.value;
        localStorage.setItem('colors', JSON.stringify(colors));
    } else {
        currentInput.value = currentButton.value;
        [prevInput.value] = [colors[0]];
        colors[0] = currentInput.value;
        colors[1] = prevInput.value;
        localStorage.setItem('colors', JSON.stringify(colors));
    }
}

function fill(event) {
    fillBucket(getCursorPosition(event))
}

function choose(event) {
    chooseColor(getCursorPosition(event))
}

function drawMouseDown(event) {
    draw = true;
    previousPosition = getCursorPosition(event);
    pencil(getCursorPosition(event), 255, 0, 0, 255);
}

function drawMouseMove(event) {
    if (draw) {
        line(previousPosition, getCursorPosition(event));
        previousPosition = getCursorPosition(event);
    }
}

function drawMouseUp() {
    draw = false; 
}

function chooseTool(event) {
    let currentButton = event.target;
    if (event.code === 'KeyB') {
        currentButton = document.querySelector('.fill-bucket');
    } else if (event.code === 'KeyP') {
        currentButton = document.querySelector('.pencil');
    } else if (event.code === 'KeyC') {
        currentButton = document.querySelector('.choose-color');
    }
    if (currentButton.tagName === 'IMG') {
        currentButton = currentButton.parentElement;
    }
    [...currentButton.parentElement.children].forEach((tool) => {
        tool.classList.remove('active');
    });
    currentButton.classList.add('active');
    isActiveTool();
}

function changeRadioBtn(event) {
    const currentButton = event.target;
    if (currentButton.classList.contains('draw-128x128')) {
        const prevCanvas = canvas.toDataURL();
        getCanvasResolution(128);
        const img = new Image();
        img.src = prevCanvas;
        img.onload = () => {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        radio = '.draw-128x128';
    } else if (currentButton.classList.contains('draw-256x256')) {
        const prevCanvas = canvas.toDataURL();
        getCanvasResolution(256);
        const img = new Image();
        img.src = prevCanvas;
        img.onload = () => {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        radio = '.draw-256x256';
    } else if (currentButton.classList.contains('draw-512x512')) {
        const prevCanvas = canvas.toDataURL();
        getCanvasResolution(512);
        const img = new Image();
        img.src = prevCanvas;
        img.onload = () => {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        radio = '.draw-512x512';
    }
}

function loadImage(event) {
    event.preventDefault();
    const town = inputSearchButton.value;
    const url = `https://api.unsplash.com/photos/random?query=town,${town}&client_id=c55b50800b16dc283e9d46bef6116f737439bfb808b6e7fb6d462df394db61e6`;
    
    (async function() {
        const jsonData = await fetch(url);
        const data = await jsonData.json();
        
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.imageSmoothingEnabled = false;
        img.src = data.urls.small;
        const w = data.width;
        const h = data.height;
        const ratio = w / h;
        const [width] = [canvas.width];
        const height = width / ratio;
        const leftDist = (canvas.width - width) / 2;
        const topDist = (canvas.height - height) / 2;
        img.onload = () => {
            ctx.drawImage(img, leftDist, topDist, width, height);  
        }
    })();
    haveImg = true;
}

function blackAndWhite() {
    if (haveImg) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let [red, green, blue, grayscale] = [0, 0, 0, 0]

        for (let i = 0; i < imageData.data.length; i += 4) {
            red = imageData.data[i];
            green = imageData.data[i + 1];
            blue = imageData.data[i + 2];
            grayscale = red * 0.3 + green * 0.59 + blue * 0.11;
            imageData.data[i] = grayscale;
            imageData.data[i + 1] = grayscale;
            imageData.data[i + 2] = grayscale;
        }

        ctx.putImageData(imageData, 0, 0);
    } else {
        alert('PLEASE LOAD IMAGE');
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function clearEventListeners() {
    canvas.removeEventListener('mousedown', fill);
    canvas.removeEventListener('mousedown', choose);
    canvas.removeEventListener('mousedown', drawMouseDown);
    canvas.removeEventListener('mousemove', drawMouseMove);
    canvas.removeEventListener('mouseup', drawMouseUp);
}

function isActiveTool() {
    const tool = [...tools.children].find((button) => button.classList.contains('active') === true);
    if (tool.classList.contains('fill-bucket')) {
        clearEventListeners();
        canvas.addEventListener('mousedown', fill);
    } else if (tool.classList.contains('choose-color')) {
        clearEventListeners();
        canvas.addEventListener('mousedown', choose);
    } else if (tool.classList.contains('pencil')) {
        clearEventListeners();
        canvas.addEventListener('mousedown', drawMouseDown);
        canvas.addEventListener('mousemove', drawMouseMove);
        canvas.addEventListener('mouseup', drawMouseUp);
    }
}

isActiveTool();
document.addEventListener('keydown', chooseTool);
tools.addEventListener('click', chooseTool);
currentInput.addEventListener('change', changeInputColor);
changeColor.addEventListener('click', changeColors);
radioButtons.addEventListener('change', changeRadioBtn);
loadButton.addEventListener('click', loadImage);
blackAndWhiteButton.addEventListener('click', blackAndWhite);
clearButton.addEventListener('click', clearCanvas);
window.addEventListener('beforeunload', () => {
    localStorage.setItem('canvasSize', JSON.stringify(canvas.height));
    localStorage.setItem('canvas', canvas.toDataURL());
    localStorage.setItem('radio', JSON.stringify(radio));
    localStorage.setItem('colors', JSON.stringify(colors));
    saveCurrentTool();
});

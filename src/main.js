// Gerekli importlar
import { Application } from "@pixi/app";
import { Sprite } from "@pixi/sprite";
import { Graphics } from "@pixi/graphics";
import { Text, TextStyle } from "@pixi/text";
import { Assets } from "@pixi/assets";
import { Container } from "@pixi/display";
import { Circle } from "@pixi/math";
import "@pixi/events";

// Asset yolları
const bgPath = new URL("./assets/bg.png", import.meta.url).href;
const shufflePath = new URL("./assets/shuffle.png", import.meta.url).href;
const circlePath = new URL("./assets/circle.png", import.meta.url).href;

// Uygulama oluştur
const app = new Application({ width: 375, height: 667, background: "#000000" });
document.body.appendChild(app.view);

// Oyun değişkenleri
let selectedLetters = [];
let lines = [];
let letters = ["G", "O", "L", "D"];
let isSelecting = false;
let isMouseDown = false;

const wordLayouts = {
  GOLD: ["G0", "O0", "L0", "D0"],
  GOD: ["G0", "O1", "D1"],
  LOG: ["L0", "O2", "G2"],
  DOG: ["D1", "O3", "G2"],
};

const correctWords = ["GOLD", "GOD", "LOG", "DOG"];
let wordContainer;
let selectedWordBox = null;
let flyingLettersFromBox = [];
let foundWords;
let letterContainer;

// Assetleri yükle
Assets.load([
  { alias: "bg", src: bgPath },
  { alias: "circle", src: circlePath },
  { alias: "shuffle", src: shufflePath },
]).then(setup);

// Başlangıç ekranı
function setup() {
  const bg = Sprite.from("bg");
  bg.width = app.screen.width;
  bg.height = app.screen.height;
  app.stage.addChild(bg);

  const startScreen = new Container();
  startScreen.name = "startScreen";

  const playButton = new Graphics();
  playButton.beginFill(0xffa500);
  playButton.drawRoundedRect(0, 0, 200, 60, 12);
  playButton.endFill();
  playButton.x = (app.screen.width - 200) / 2;
  playButton.y = app.screen.height / 2 - 30;
  playButton.eventMode = "static";
  playButton.cursor = "pointer";

  const playText = new Text("Play Game", new TextStyle({
    fontSize: 28,
    fill: "#000000",
    fontWeight: "bold",
  }));
  playText.anchor.set(0.5);
  playText.x = 100;
  playText.y = 30;

  playButton.addChild(playText);
  startScreen.addChild(playButton);
  app.stage.addChild(startScreen);

  playButton.on("pointerdown", () => {
    app.stage.removeChild(startScreen);
    initializeGame();
  });
}

function initializeGame() {
    app.stage.eventMode = "static";
  
    // Arka plan
    const bg = Sprite.from("bg");
    bg.width = app.screen.width;
    bg.height = app.screen.height;
    app.stage.addChild(bg);
  
    // Ortadaki turuncu çember
    const circle = Sprite.from("circle");
    circle.anchor.set(0.5);
    circle.x = app.screen.width / 2;
    circle.y = app.screen.height / 2 + 200;
    circle.alpha = 0.3;
    circle.width = 220;
    circle.height = 220;
    app.stage.addChild(circle);
  
    // Oyun için ana container'lar
    const letterContainer = new Container();
    letterContainer.name = "letters";
    app.stage.addChild(letterContainer);
  
    wordContainer = new Container();
    app.stage.addChild(wordContainer);
  
    const foundWords = new Set(); // Bulunan kelimeler
    let selectedWordBox = null;
    let selectedWordText = null;
    let flyingLettersFromBox = [];
  
    drawWordTable();
    drawLetters();

    function drawLetters() {
        const centerX = app.screen.width / 2;
        const centerY = app.screen.height / 2 + 200;
        const radius = 75;
    
        const existingLetters = {};
        letterContainer.children.forEach(child => {
          if (child instanceof Text) {
            existingLetters[child.text] = child;
          }
        });
    
        // Önceki harfler silinmesin , sadece highlightlar temizlensin
        letterContainer.children
          .filter(child => child.name === "highlight")
          .forEach(child => letterContainer.removeChild(child));
    
        letters.forEach((char, i) => {
          const angle = (i / letters.length) * Math.PI * 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
    
          let text = existingLetters[char];
    
          if (!text) {
            // Yeni harf oluştur
            text = new Text(char, new TextStyle({
              fontSize: 40,
              fill: "#FFA500",
              fontWeight: "bold",
            }));
            text.anchor.set(0.5);
            text.alpha = 1;
            text.eventMode = "dynamic";
            text.cursor = "pointer";
            text.hitArea = new Circle(0, 0, 30);
    
            text.on("pointerdown", () => {
              if (selectedLetters.includes(text)) return;
              isMouseDown = true;
              isSelecting = true;
              selectedLetters.push(text);
              highlightLetter(text);
            });
    
            letterContainer.addChild(text);
          }
          animateToPosition(text, x, y); // Harfleri animasyonla yerine yerleştir
        });
      }

      function highlightLetter(textObj) {
        const circle = new Graphics();
        circle.beginFill(0xffa500);  //turuncu kodu
        circle.lineStyle(2, 0xffa500, 1);
        circle.drawCircle(0, 0, 30);
        circle.endFill();
        circle.x = textObj.x;
        circle.y = textObj.y;
        circle.name = "highlight";
      
        const parent = textObj.parent;  // harfin arkasına yollamak için
        parent.addChildAt(circle, parent.getChildIndex(textObj));
      
        textObj.style = new TextStyle({
          ...textObj.style,
          fill: "#FFFFFF",
        });
      
        updateSelectedWordBox();
      }
      

      function clearSelections() {    // seçim temizleme
        if (selectedWordBox) {
          app.stage.removeChild(selectedWordBox);
          selectedWordBox = null;
          selectedWordText = null;
          flyingLettersFromBox = [];
        }
      
        letterContainer.children
          .filter((child) => child.name === "highlight")
          .forEach((child) => letterContainer.removeChild(child));
      
        lines.forEach((line) => app.stage.removeChild(line));
        lines = [];
      
        selectedLetters.forEach((letter) => {
          letter.style.fill = "#FFA500";
        });
      
        selectedLetters = [];
      }
      

      function drawLine(startText, endText) { //harfler arası çizgi
        const line = new Graphics();
        line.lineStyle(8, 0xffa500, 1); // 8 çizilen çizgi kalınlığı
        line.moveTo(startText.x, startText.y);
        line.lineTo(endText.x, endText.y);
        app.stage.addChild(line);
        return line;
      }
      

      function drawWordTable() {
        const startX = 70;
        const startY = 150;
        const boxSize = 50;
        const gap = 10;
      
        const layout = {
          G0: { x: startX + 0 * (boxSize + gap), y: startY },
          O0: { x: startX + 1 * (boxSize + gap), y: startY },
          L0: { x: startX + 2 * (boxSize + gap), y: startY },
          D0: { x: startX + 3 * (boxSize + gap), y: startY },
      
          O1: { x: startX, y: startY + 1 * (boxSize + gap) },
          D1: { x: startX, y: startY + 2 * (boxSize + gap) },
      
          O2: { x: startX + 2 * (boxSize + gap), y: startY + 1 * (boxSize + gap) },
          G2: { x: startX + 2 * (boxSize + gap), y: startY + 2 * (boxSize + gap) },
      
          O3: { x: startX + 1 * (boxSize + gap), y: startY + 2 * (boxSize + gap) },
        };
      
        for (const key in layout) {
          const { x, y } = layout[key];
      
          const box = new Graphics();
          box.beginFill(0xffffff);
          box.drawRoundedRect(0, 0, boxSize, boxSize, 6);
          box.endFill();
      
          const text = new Text("", new TextStyle({
            fontSize: 22,
            fill: "#000000",
            fontWeight: "bold",
          }));
          text.anchor.set(0.5);
          text.x = boxSize / 2;
          text.y = boxSize / 2;
      
          const letterBox = new Container();
          letterBox.name = key;
          letterBox.x = x;
          letterBox.y = y;
          letterBox.addChild(box);
          letterBox.addChild(text);
      
          wordContainer.addChild(letterBox);
        }
      }
      

      function checkWord() {
        const selectedWord = selectedLetters.map((l) => l.text).join("").toUpperCase();
        if (selectedWord === "") return;
      
        if (wordLayouts[selectedWord]) {
          if (foundWords.has(selectedWord)) {
            shakeLetters();
            clearSelections();
          } else {
            animateLettersToBoxes(selectedWord, flyingLettersFromBox, (wasPlaced) => {
              if (wasPlaced) {
                foundWords.add(selectedWord);
              }
      
              if (foundWords.size === correctWords.length) {
                showCongrats();
              }
      
              clearSelections();
            });
          }
        } else {
          shakeLetters();
          clearSelections();
        }
      }
      

      const shuffleButton = Sprite.from("shuffle");
      shuffleButton.scale.set(0.1);
      shuffleButton.anchor.set(0.5);
      shuffleButton.x = app.screen.width / 2;
      shuffleButton.y = app.screen.height - 130;
      shuffleButton.eventMode = "static";
      shuffleButton.cursor = "pointer";
      app.stage.addChild(shuffleButton);
      
      shuffleButton.on("pointerdown", () => {
        const newLetters = shuffleArray(letters);
        letters = newLetters;
        drawLetters();
      });
      

      app.stage.on("pointerdown", () => {
        isMouseDown = true;
      });
      
      app.stage.on("pointerup", () => {
        isMouseDown = false;
        isSelecting = false;
        checkWord();
        clearSelections();
      });
      
      window.addEventListener("mouseup", () => {
        isMouseDown = false;
        isSelecting = false;
        clearSelections();
      });
      
      app.stage.on("pointermove", (e) => {
        if (!isSelecting || !isMouseDown) return;
      
        const pointerPos = e.global;
      
        for (const letter of letterContainer.children) {
          const bounds = letter.getBounds();
      
          if (
            bounds.contains(pointerPos.x, pointerPos.y) &&
            !selectedLetters.includes(letter)
          ) {
            const lastLetter = selectedLetters[selectedLetters.length - 1];
            const line = drawLine(lastLetter, letter);
            lines.push(line);
            selectedLetters.push(letter);
            highlightLetter(letter);
            break;
          }
        }
      });
      

  function shuffleArray(array) {
    let shuffled = [...array];
    let isSame = true;
  
    while (isSame) {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      isSame = shuffled.join("") === array.join("");
    }
  
    return shuffled;
  }
  

  function shakeLetters() {
    selectedLetters.forEach((letter) => {
      const originalX = letter.x;
      let t = 0;
      const interval = setInterval(() => {
        t++;
        letter.x = originalX + Math.sin(t * 0.5) * 5;
        if (t > 10) {
          clearInterval(interval);
          letter.x = originalX;
        }
      }, 16);
    });
  }

  function showCongrats() {
    const alreadyExists = app.stage.children.find(c => c.name === "congratsOverlay");
    if (alreadyExists) return;
  
    const overlay = new Container();
    overlay.name = "congratsOverlay";
  
    const bg = new Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRect(0, 0, app.screen.width, app.screen.height);
    bg.endFill();
    overlay.addChild(bg);
  
    const congratsText = new Text("CONGRATS!", new TextStyle({
      fontSize: 48,
      fill: "#FFFFFF",
      fontWeight: "bold",
    }));
    congratsText.anchor.set(0.5);
    congratsText.x = app.screen.width / 2;
    congratsText.y = app.screen.height / 2 - 60;
    overlay.addChild(congratsText);
  
    const restartBtn = new Container();
    restartBtn.x = (app.screen.width - 180) / 2;
    restartBtn.y = app.screen.height / 2 + 10;
    restartBtn.eventMode = "static";
    restartBtn.cursor = "pointer";
  
    const restartBg = new Graphics();
    restartBg.beginFill(0xffa500);
    restartBg.drawRoundedRect(0, 0, 180, 50, 12);
    restartBg.endFill();
  
    const restartText = new Text("Restart", new TextStyle({
      fontSize: 24,
      fill: "#000000",
      fontWeight: "bold",
    }));
    restartText.anchor.set(0.5);
    restartText.x = 90;
    restartText.y = 25;
  
    restartBtn.addChild(restartBg);
    restartBtn.addChild(restartText);
    overlay.addChild(restartBtn);
  
    restartBtn.on("pointerdown", () => {
      app.stage.removeChild(overlay);
      resetGame();
    });
  
    app.stage.addChild(overlay);
  }
  

  function resetGame() {
    foundWords.clear();
    clearSelections();
  
    // Tabloyu temizle
    wordContainer.children.forEach((box) => {
      const txt = box.children.find((c) => c instanceof Text);
      if (txt) txt.text = "";
  
      const bg = box.children.find((c) => c instanceof Graphics);
      if (bg) {
        bg.clear();
        bg.beginFill(0xffffff);
        bg.drawRoundedRect(0, 0, 50, 50, 6);
        bg.endFill();
      }
    });
  
    drawLetters();
  }
  

  function showSelectedWordBox(word, onComplete) {
    if (selectedWordBox) app.stage.removeChild(selectedWordBox);
  
    selectedWordBox = new Container();
    selectedWordBox.name = "selectedWordBox";
  
    const padding = 20, spacing = 10, letterSize = 32;
    const letters = [];
  
    for (let char of word) {
      const letter = new Text(char, new TextStyle({
        fontSize: letterSize,
        fill: "#FFFFFF",
        fontWeight: "bold",
      }));
      letter.anchor.set(0.5);
      letters.push(letter);
      selectedWordBox.addChild(letter);
    }
  
    const totalWidth = word.length * (letterSize + spacing) - spacing + padding * 2;
    const boxHeight = letterSize + padding * 2;
  
    const bg = new Graphics();
    bg.beginFill(0xffa500);
    bg.drawRoundedRect(0, 0, totalWidth, boxHeight, 12);
    bg.endFill();
    selectedWordBox.addChildAt(bg, 0);
  
    letters.forEach((letter, i) => {
      letter.x = padding + i * (letterSize + spacing) + letterSize / 2;
      letter.y = boxHeight / 2;
    });
  
    selectedWordBox.x = (app.screen.width - totalWidth) / 2;
    selectedWordBox.y = 350;
    app.stage.addChild(selectedWordBox);
  
    setTimeout(() => {
      animateLettersToBoxes(word, letters, onComplete);
    }, 1000);
  }
  

  function animateLettersToBoxes(word, flyingLetters, onComplete) {
    const layout = wordLayouts[word];
    if (!layout) {
      if (selectedWordBox) app.stage.removeChild(selectedWordBox);
      selectedWordBox = null;
      onComplete(false);
      return;
    }
  
    let finished = 0;
    let anyPlaced = false;
  
    for (let i = 0; i < layout.length; i++) {
      const letter = flyingLetters[i];
      const boxName = layout[i];
      const char = word[i];
  
      const letterBox = wordContainer.children.find((c) => c.name === boxName);
      if (!letterBox) { finished++; continue; }
  
      const targetText = letterBox.children.find((c) => c instanceof Text);
      if (!targetText || targetText.text !== "") {
        finished++;
        continue;
      }
  
      anyPlaced = true;
      const globalPos = letter.getBounds(app.stage);
      const flying = new Text(char, new TextStyle({
        fontSize: 32,
        fill: "#FFA500",
        fontWeight: "bold",
      }));
      flying.anchor.set(0.5);
      flying.x = globalPos.x + globalPos.width / 2;
      flying.y = globalPos.y + globalPos.height / 2;
      app.stage.addChild(flying);
  
      const targetX = letterBox.x + targetText.x;
      const targetY = letterBox.y + targetText.y;
  
      let t = 0, duration = 40;
  
      const animate = () => {
        t++;
        const progress = Math.min(t / duration, 1);
        flying.x += (targetX - flying.x) * 0.2;
        flying.y += (targetY - flying.y) * 0.2;
  
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          app.stage.removeChild(flying);
          targetText.text = char;
          targetText.style.fill = "#FFFFFF";
  
          const bg = letterBox.children.find((c) => c instanceof Graphics);
          if (bg) {
            bg.clear();
            bg.beginFill(0xffa500);
            bg.drawRoundedRect(0, 0, 50, 50, 6);
            bg.endFill();
          }
  
          finished++;
          if (finished === layout.length) {
            if (selectedWordBox) app.stage.removeChild(selectedWordBox);
            selectedWordBox = null;
            onComplete(anyPlaced); // bitiş
          }
        }
      };
      animate();
    }
  
    if (layout.length === 0) {  // Eğer bazı harfler hiç uçmadıysa (kutular doluydu), yine de callback çalışmalı
      onComplete(false);
    }
  }
  
  function updateSelectedWordBox() {
    const word = selectedLetters.map((l) => l.text).join("");
  
    if (!selectedWordBox) {
      selectedWordBox = new Container();
      flyingLettersFromBox = [];
      app.stage.addChild(selectedWordBox);
    }
  
    selectedWordBox.removeChildren();
    flyingLettersFromBox = [];
  
    const paddingX = 12, paddingY = 8, fontSize = 24, spacing = 6;
    let totalWidth = 0;
    const letters = [];
  
    for (let char of word) {
      const letter = new Text(char, new TextStyle({
        fontSize,
        fill: "#FFFFFF",
        fontWeight: "bold",
      }));
      letter.anchor.set(0.5);
      letters.push(letter);
      totalWidth += letter.width + spacing;
    }
  
    totalWidth -= spacing; // harften sonra boşluk olmaması için ***
    const boxWidth = totalWidth + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;
  
    const bg = new Graphics();
    bg.beginFill(0xffa500);
    bg.drawRoundedRect(0, 0, boxWidth, boxHeight, 10);
    bg.endFill();
    selectedWordBox.addChild(bg);
  
    let currentX = paddingX;
    letters.forEach((letter) => {
      letter.x = currentX + letter.width / 2;
      letter.y = boxHeight / 2;
      selectedWordBox.addChild(letter);
      flyingLettersFromBox.push(letter);
      currentX += letter.width + spacing;
    });
  
    selectedWordBox.x = (app.screen.width - boxWidth) / 2;
    selectedWordBox.y = 350;
  }
  

  function animateToPosition(displayObject, targetX, targetY) {
    let t = 0;
    const duration = 40;
    const startX = displayObject.x;
    const startY = displayObject.y;
  
    const animate = () => {
      t++;
      const progress = t / duration;
      displayObject.x = startX + (targetX - startX) * progress;
      displayObject.y = startY + (targetY - startY) * progress;
  
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
  
    animate();
  }
  
}

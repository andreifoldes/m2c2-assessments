import {
  Game,
  Action,
  Scene,
  Shape,
  Label,
  Timer,
  WebColors,
  RandomDraws,
  Transition,
} from "@m2c2kit/core";

// m2c2kit standard palette (light background)
const SCENE_BG = [255, 255, 255, 1];
const TEXT_PRIMARY = [0, 0, 0, 1];
const TEXT_SECONDARY = [100, 100, 100, 1];
const TEXT_TERTIARY = [140, 140, 140, 1];
const BUTTON_BG = [0, 0, 0, 1];
const BUTTON_TEXT = [255, 255, 255, 1];
const START_BUTTON_BG = [0, 128, 0, 1];

// Prices-specific colors
const CARD_BG = [240, 240, 245, 1];
const ACCENT = [200, 160, 0, 1];
const GREEN = [76, 175, 80, 1];
const RED = [211, 47, 47, 1];
const PROGRESS_BG = [220, 220, 230, 1];
const TRANSPARENT = [0, 0, 0, 0];

const LOCALE_TO_CURRENCY = {
  "en-US": "USD",
  "en-GB": "GBP",
  "en-AU": "AUD",
  "en-CA": "CAD",
  "en-NZ": "NZD",
  "en-IE": "EUR",
  "en-ZA": "ZAR",
  "en-IN": "INR",
  "fr-FR": "EUR",
  "fr-CA": "CAD",
  "fr-BE": "EUR",
  "fr-CH": "CHF",
  "de-DE": "EUR",
  "de-AT": "EUR",
  "de-CH": "CHF",
  "es-ES": "EUR",
  "es-MX": "MXN",
  "es-US": "USD",
  "es-AR": "ARS",
  "es-CO": "COP",
  "es-CL": "CLP",
  "it-IT": "EUR",
  "it-CH": "CHF",
  "nl-NL": "EUR",
  "nl-BE": "EUR",
  "pt-PT": "EUR",
  "pt-BR": "BRL",
  "ja-JP": "JPY",
  "ko-KR": "KRW",
  "zh-CN": "CNY",
  "zh-TW": "TWD",
  "hi-IN": "INR",
  "da-DK": "DKK",
  "sv-SE": "SEK",
  "nb-NO": "NOK",
  "nn-NO": "NOK",
  "fi-FI": "EUR",
  "pl-PL": "PLN",
  "ru-RU": "RUB",
  "tr-TR": "TRY",
  "th-TH": "THB",
  "ms-MY": "MYR",
  "id-ID": "IDR",
  "vi-VN": "VND",
  "he-IL": "ILS",
  "ar-SA": "SAR",
  "ar-AE": "AED",
};

const LANGUAGE_FALLBACK_CURRENCY = {
  en: "GBP",
  fr: "EUR",
  de: "EUR",
  es: "EUR",
  it: "EUR",
  nl: "EUR",
  pt: "EUR",
  ja: "JPY",
  ko: "KRW",
  zh: "CNY",
  hi: "INR",
  da: "DKK",
  sv: "SEK",
  nb: "NOK",
  nn: "NOK",
  fi: "EUR",
  pl: "PLN",
  ru: "RUB",
  tr: "TRY",
  th: "THB",
  ar: "SAR",
};

const ZERO_DECIMAL_CURRENCIES = new Set([
  "JPY",
  "KRW",
  "VND",
  "CLP",
  "IDR",
  "COP",
]);

// Approximate units of local currency per 1 USD.
// Used to convert the minimum distractor distance from USD to local units.
const USD_EXCHANGE_RATES = {
  USD: 1.0,
  GBP: 0.79,
  EUR: 0.92,
  AUD: 1.55,
  CAD: 1.37,
  NZD: 1.72,
  CHF: 0.88,
  DKK: 6.9,
  SEK: 10.5,
  NOK: 10.8,
  PLN: 4.0,
  MXN: 17.0,
  BRL: 5.0,
  ZAR: 18.5,
  INR: 83.0,
  TRY: 30.0,
  THB: 35.0,
  MYR: 4.7,
  ILS: 3.7,
  SAR: 3.75,
  AED: 3.67,
  RUB: 92.0,
  CNY: 7.2,
  TWD: 31.5,
  JPY: 150.0,
  KRW: 1330.0,
  VND: 25000.0,
  IDR: 15700.0,
  COP: 4000.0,
  CLP: 940.0,
  ARS: 870.0,
};

// Prices are generated in a 1–9 internal range. A distractor distance larger
// than 4.0 can make it impossible to find a valid pair when the correct price
// sits near the centre of that range. This cap keeps generation feasible.
const MAX_RAW_DISTANCE = 4.0;

const ITEM_POOL = [
  "Almonds",
  "Applesauce",
  "Blueberries",
  "Cashews",
  "Celery",
  "Cereal",
  "Cheeseburger",
  "Cooking Spray",
  "Cucumber",
  "Limes",
  "Noodles",
  "Pineapple",
  "Ramen",
  "Rolls",
  "Salad",
  "Salsa",
  "Sandwich",
  "Spinach",
  "Tortillas",
  "Vegetable Oil",
  "Waffles",
  "Zucchini",
  "Aluminum Foil",
  "Batteries",
  "Bleach",
  "Detergent",
  "Dish Soap",
  "Dryer Sheets",
  "Light Bulbs",
  "Napkins",
  "Paper Towels",
  "Pencils",
  "Plastic Wrap",
  "Sponge",
  "Toilet Paper",
  "Trash Bags",
  "Aspirin",
  "Conditioner",
  "Floss",
  "Lotion",
];

const TUTORIAL_ITEMS = [
  { item: "Bananas", price: 3.27, alt: 6.78 },
  { item: "Soup", price: 5.82, alt: 2.01 },
  { item: "Dental Floss", price: 7.63, alt: 2.33 },
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = RandomDraws.singleFromRange(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValidPrice(price) {
  const dollars = Math.floor(price);
  const cents = Math.round((price - dollars) * 100);
  const d1 = dollars;
  const d2 = Math.floor(cents / 10);
  const d3 = cents % 10;
  if (d1 === d2 || d1 === d3 || d2 === d3) return false;
  const sorted = [d1, d2, d3].sort((a, b) => a - b);
  if (sorted[2] - sorted[1] === 1 && sorted[1] - sorted[0] === 1) return false;
  return true;
}

function generatePrice() {
  let price;
  do {
    const dollars = RandomDraws.singleFromRange(1, 9);
    const cents = RandomDraws.singleFromRange(1, 99);
    price = dollars + cents / 100;
  } while (!isValidPrice(price));
  return price;
}

function generateDistractor(correctPrice, minDistance) {
  let d;
  let attempts = 0;
  do {
    d = generatePrice();
    attempts++;
    if (attempts > 1000) break;
  } while (Math.abs(d - correctPrice) < minDistance);
  return d;
}

function generatePriceSet(
  numItems,
  minDistance,
  excludedItems = [],
  usedItemPrices = {},
) {
  const available = ITEM_POOL.filter(
    (item) => !excludedItems.includes(item),
  );
  if (available.length < numItems) {
    console.warn(
      `[Prices] Only ${available.length} items available after exclusions (need ${numItems})`,
    );
  }
  const shuffled = shuffleArray(available);
  const items = shuffled.slice(0, numItems);
  return items.map((item) => {
    const usedPrices = usedItemPrices[item] || [];
    let price;
    let attempts = 0;
    do {
      price = generatePrice();
      attempts++;
    } while (
      usedPrices.some((p) => Math.abs(p - price) < 0.005) &&
      attempts < 1000
    );
    const alt = generateDistractor(price, minDistance);
    return { item, price, alt };
  });
}

export class Prices extends Game {
  constructor() {
    const defaultParameters = {
      number_of_items: {
        default: 10,
        type: "number",
        description: "Number of item-price pairs per session",
      },
      learning_duration_ms: {
        default: 3000,
        type: "number",
        description: "Display duration per item in learning phase (ms)",
      },
      show_good_price_question: {
        default: true,
        type: "boolean",
        description:
          "Show 'Is this a good price?' question during learning phase",
      },
      show_tutorial: {
        default: true,
        type: "boolean",
        description: "Show the tutorial before the test",
      },
      min_price_distance_usd: {
        default: 3.0,
        type: "number",
        description:
          "Minimum separation between correct price and distractor, " +
          "expressed in USD. Automatically converted to the local " +
          "currency equivalent using approximate exchange rates.",
      },
      locale: {
        default: "en-GB",
        type: "string",
        description:
          "BCP 47 locale tag (e.g. 'en-GB', 'fr-FR'). " +
          "Set to 'auto' to detect from the browser.",
      },
      currency: {
        default: "GBP",
        type: "string",
        description:
          "ISO 4217 currency code (e.g. 'GBP', 'EUR'). " +
          "Set to 'auto' to infer from locale.",
      },
      excluded_items: {
        default: "",
        type: "string",
        description:
          "Comma-separated item names to exclude from this session. " +
          "Use for within-day no-repeat rule (Rule 7).",
      },
      used_item_prices: {
        default: "{}",
        type: "string",
        description:
          "JSON object mapping item names to arrays of previously used prices. " +
          'E.g. \'{"Almonds":[3.27,5.82],"Cereal":[7.63]}\'. ' +
          "Prevents re-presenting the same item-price pair (Rule 8).",
      },
    };

    super({
      name: "Prices",
      id: "prices",
      publishUuid: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      version: "1.0.0",
      shortDescription:
        "Associative memory test: learn item-price pairs and recognize them",
      width: 400,
      height: 800,
      stretch: true,
      fonts: [
        {
          fontName: "roboto",
          url: "fonts/roboto/Roboto-Regular.ttf",
        },
      ],
      images: [],
      trialSchema: {
        trial_index: {
          type: "integer",
          description: "0-based trial index (recognition phase)",
        },
        item: {
          type: "string",
          description: "Item name",
        },
        correct_price: {
          type: "string",
          description: "Correct price string",
        },
        distractor_price: {
          type: "string",
          description: "Distractor price string",
        },
        good_price_response: {
          type: ["integer", "null"],
          description:
            "Learning phase response: 1=yes, 0=no, null=no response or question hidden",
        },
        correct_position: {
          type: "integer",
          description: "Position of correct price (0=top, 1=bottom)",
        },
        selected_position: {
          type: "integer",
          description: "Position selected by participant (0=top, 1=bottom)",
        },
        is_correct: {
          type: "boolean",
          description: "Whether participant selected the correct price",
        },
        response_time_ms: {
          type: "number",
          description:
            "Time from recognition question display to response (ms)",
        },
        learning_display_timestamp: {
          type: "number",
          description:
            "performance.now() when item was shown in learning phase",
        },
        recognition_display_timestamp: {
          type: "number",
          description:
            "performance.now() when recognition question was displayed",
        },
        response_timestamp: {
          type: "number",
          description: "performance.now() when participant responded",
        },
        locale: {
          type: "string",
          description: "Resolved BCP 47 locale tag used for this session",
        },
        currency: {
          type: "string",
          description: "ISO 4217 currency code used for this session",
        },
      },
      parameters: defaultParameters,
    });
  }

  async initialize() {
    await super.initialize();

    this._priceSet = [];
    this._recognitionOrder = [];
    this._learningIndex = 0;
    this._recognitionIndex = 0;
    this._testStartTime = 0;
    this._goodPriceResponses = [];
    this._learningTimestamps = [];
    this._currentRecognitionDisplayTime = 0;
    this._responded = false;

    this._resolveCurrency();

    if (this.getParameter("show_tutorial")) {
      this._buildTutorialScenes();
    }
    this._buildInstructionsScene();
    this._buildCountdownScene();
    this._buildLearningScene();
    this._buildTransitionScene();
    this._buildRecognitionScene();
    this._buildEndScene();
  }

  // ─── Tutorial ────────────────────────────────────────────

  _buildTutorialScenes() {
    // Screen 1: Welcome
    const s1 = new Scene({ name: "tut_1", backgroundColor: SCENE_BG });
    this.addScene(s1);

    s1.addChild(
      new Label({
        text: "Prices",
        fontSize: 36,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 160 },
      }),
    );

    s1.addChild(
      new Shape({
        rect: { width: 280, height: 3 },
        fillColor: ACCENT,
        position: { x: 200, y: 195 },
      }),
    );

    s1.addChild(
      new Label({
        text: "This test has two parts.\n\nFirst, you will see items with\nprices. Try to remember each\nitem-price pair.\n\nThen, you will be asked to\nrecall which price went with\neach item.",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 380 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    const nextBtn1Bg = new Shape({
      rect: { width: 240, height: 54 },
      cornerRadius: 27,
      fillColor: BUTTON_BG,
      position: { x: 200, y: 640 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    s1.addChild(nextBtn1Bg);
    s1.addChild(
      new Label({
        text: "NEXT",
        fontSize: 20,
        fontColor: BUTTON_TEXT,
        position: { x: 200, y: 640 },
        zPosition: 11,
      }),
    );
    nextBtn1Bg.onTapDown(() =>
      this.presentScene("tut_2", Transition.none()),
    );

    this._addSkipTutorialButton(s1);

    // Screen 2: Learning phase example
    const s2 = new Scene({ name: "tut_2", backgroundColor: SCENE_BG });
    this.addScene(s2);

    s2.addChild(
      new Label({
        text: "Part 1: Learning",
        fontSize: 28,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 80 },
      }),
    );

    s2.addChild(
      new Label({
        text: "You will see an item and its price.\nEach pair is shown for 3 seconds.",
        fontSize: 16,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 135 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    // Example card
    const exCard = new Shape({
      rect: { width: 300, height: 220 },
      cornerRadius: 16,
      fillColor: CARD_BG,
      position: { x: 200, y: 310 },
    });
    s2.addChild(exCard);

    s2.addChild(
      new Label({
        text: "Soup",
        fontSize: 30,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 260 },
      }),
    );
    s2.addChild(
      new Label({
        text: this._formatPrice(TUTORIAL_ITEMS[1].price),
        fontSize: 38,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 310 },
      }),
    );
    s2.addChild(
      new Label({
        text: "Is this a good price?",
        fontSize: 16,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 365 },
      }),
    );

    // Yes / No example buttons
    const yesEx = new Shape({
      rect: { width: 80, height: 36 },
      cornerRadius: 18,
      fillColor: [220, 220, 225, 1],
      position: { x: 155, y: 400 },
    });
    s2.addChild(yesEx);
    s2.addChild(
      new Label({
        text: "Yes",
        fontSize: 15,
        fontColor: TEXT_PRIMARY,
        position: { x: 155, y: 400 },
      }),
    );

    const noEx = new Shape({
      rect: { width: 80, height: 36 },
      cornerRadius: 18,
      fillColor: [220, 220, 225, 1],
      position: { x: 245, y: 400 },
    });
    s2.addChild(noEx);
    s2.addChild(
      new Label({
        text: "No",
        fontSize: 15,
        fontColor: TEXT_PRIMARY,
        position: { x: 245, y: 400 },
      }),
    );

    // Hint tooltip
    const tooltipBg = new Shape({
      rect: { width: 280, height: 50 },
      cornerRadius: 10,
      fillColor: ACCENT,
      position: { x: 200, y: 490 },
    });
    s2.addChild(tooltipBg);
    s2.addChild(
      new Label({
        text: "Choose the answer that makes\nsense to you.",
        fontSize: 14,
        fontColor: [255, 255, 255, 1],
        position: { x: 200, y: 490 },
        preferredMaxLayoutWidth: 260,
      }),
    );

    const nextBtn2Bg = new Shape({
      rect: { width: 240, height: 54 },
      cornerRadius: 27,
      fillColor: BUTTON_BG,
      position: { x: 200, y: 640 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    s2.addChild(nextBtn2Bg);
    s2.addChild(
      new Label({
        text: "NEXT",
        fontSize: 20,
        fontColor: BUTTON_TEXT,
        position: { x: 200, y: 640 },
        zPosition: 11,
      }),
    );
    nextBtn2Bg.onTapDown(() =>
      this.presentScene("tut_3", Transition.none()),
    );

    this._addSkipTutorialButton(s2);

    // Screen 3: Recognition phase example
    const s3 = new Scene({ name: "tut_3", backgroundColor: SCENE_BG });
    this.addScene(s3);

    s3.addChild(
      new Label({
        text: "Part 2: Recognition",
        fontSize: 28,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 80 },
      }),
    );

    s3.addChild(
      new Label({
        text: "You will see the item and two prices.\nTap the price you remember.",
        fontSize: 16,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 135 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    s3.addChild(
      new Label({
        text: "Bananas",
        fontSize: 30,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 230 },
      }),
    );
    s3.addChild(
      new Label({
        text: "What was the price?",
        fontSize: 18,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 275 },
      }),
    );

    // Two example price buttons
    const btn1Ex = new Shape({
      rect: { width: 260, height: 64 },
      cornerRadius: 14,
      fillColor: CARD_BG,
      position: { x: 200, y: 370 },
    });
    s3.addChild(btn1Ex);
    s3.addChild(
      new Label({
        text: this._formatPrice(TUTORIAL_ITEMS[0].price),
        fontSize: 26,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 370 },
      }),
    );

    const btn2Ex = new Shape({
      rect: { width: 260, height: 64 },
      cornerRadius: 14,
      fillColor: CARD_BG,
      position: { x: 200, y: 460 },
    });
    s3.addChild(btn2Ex);
    s3.addChild(
      new Label({
        text: this._formatPrice(TUTORIAL_ITEMS[0].alt),
        fontSize: 26,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 460 },
      }),
    );

    // Hint tooltip
    const tooltip3Bg = new Shape({
      rect: { width: 280, height: 50 },
      cornerRadius: 10,
      fillColor: ACCENT,
      position: { x: 200, y: 550 },
    });
    s3.addChild(tooltip3Bg);
    s3.addChild(
      new Label({
        text: "Try your best to recall the\nprice from part one.",
        fontSize: 14,
        fontColor: [255, 255, 255, 1],
        position: { x: 200, y: 550 },
        preferredMaxLayoutWidth: 260,
      }),
    );

    const beginBtnBg = new Shape({
      rect: { width: 240, height: 54 },
      cornerRadius: 27,
      fillColor: START_BUTTON_BG,
      position: { x: 200, y: 640 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    s3.addChild(beginBtnBg);
    s3.addChild(
      new Label({
        text: "BEGIN TEST",
        fontSize: 20,
        fontColor: BUTTON_TEXT,
        position: { x: 200, y: 640 },
        zPosition: 11,
      }),
    );
    beginBtnBg.onTapDown(() =>
      this.presentScene("instructions", Transition.none()),
    );

    this._addSkipTutorialButton(s3);
  }

  _addSkipTutorialButton(scene) {
    const label = new Label({
      text: "Skip tutorial",
      fontSize: 14,
      fontColor: TEXT_TERTIARY,
      position: { x: 200, y: 740 },
      isUserInteractionEnabled: true,
      zPosition: 20,
    });
    scene.addChild(label);
    label.onTapDown(() =>
      this.presentScene("instructions", Transition.none()),
    );
  }

  // ─── Instructions ────────────────────────────────────────

  _buildInstructionsScene() {
    const scene = new Scene({
      name: "instructions",
      backgroundColor: SCENE_BG,
    });
    this.addScene(scene);

    // Accent bar at top
    scene.addChild(
      new Shape({
        rect: { width: 400, height: 6 },
        fillColor: ACCENT,
        position: { x: 200, y: 3 },
      }),
    );

    scene.addChild(
      new Label({
        text: "Prices",
        fontSize: 38,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 160 },
      }),
    );

    scene.addChild(
      new Shape({
        rect: { width: 80, height: 3 },
        fillColor: ACCENT,
        position: { x: 200, y: 190 },
      }),
    );

    const numItems = this.getParameter("number_of_items");
    scene.addChild(
      new Label({
        text:
          "Please decide if the displayed price\n" +
          "is a good bargain for that item.\n\n" +
          "The pair will only remain on the\n" +
          "screen for a short time, so please\n" +
          "make decisions quickly and pay\n" +
          "close attention.",
        fontSize: 17,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 370 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    if (this.getParameter("show_tutorial")) {
      const tutLabel = new Label({
        text: "View a Tutorial",
        fontSize: 16,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 560 },
        isUserInteractionEnabled: true,
        zPosition: 10,
      });
      scene.addChild(tutLabel);
      tutLabel.onTapDown(() =>
        this.presentScene("tut_1", Transition.none()),
      );
    }

    const startBtnBg = new Shape({
      rect: { width: 280, height: 56 },
      cornerRadius: 28,
      fillColor: START_BUTTON_BG,
      position: { x: 200, y: 660 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(startBtnBg);
    scene.addChild(
      new Label({
        text: "BEGIN TEST",
        fontSize: 20,
        fontColor: BUTTON_TEXT,
        position: { x: 200, y: 660 },
        zPosition: 11,
      }),
    );
    startBtnBg.onTapDown(() => {
      this._startTest();
    });
  }

  // ─── Countdown Scene ─────────────────────────────────────

  _buildCountdownScene() {
    const scene = new Scene({ name: "countdown", backgroundColor: SCENE_BG });
    this.addScene(scene);

    const circle = new Shape({
      circleOfRadius: 80,
      fillColor: WebColors.RoyalBlue,
      position: { x: 200, y: 340 },
    });
    scene.addChild(circle);

    const numberLabel = new Label({
      name: "countdownNumber",
      text: "",
      fontSize: 50,
      fontColor: WebColors.White,
      position: { x: 200, y: 340 },
    });
    scene.addChild(numberLabel);

    scene.addChild(
      new Label({
        text: "GET READY",
        fontSize: 32,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 470 },
      }),
    );

    const self = this;
    scene.onAppear(() => {
      numberLabel.text = "3";
      scene.run(
        Action.sequence([
          Action.wait({ duration: 1000 }),
          Action.custom({ callback: () => { numberLabel.text = "2"; } }),
          Action.wait({ duration: 1000 }),
          Action.custom({ callback: () => { numberLabel.text = "1"; } }),
          Action.wait({ duration: 1000 }),
          Action.custom({
            callback: () => {
              self.presentScene("learning", Transition.none());
            },
          }),
        ]),
      );
    });
  }

  // ─── Learning Scene ──────────────────────────────────────

  _buildLearningScene() {
    const scene = new Scene({ name: "learning", backgroundColor: SCENE_BG });
    this.addScene(scene);

    // Progress bar
    scene.addChild(
      new Shape({
        name: "learnProgressBg",
        rect: { width: 360, height: 4 },
        cornerRadius: 2,
        fillColor: PROGRESS_BG,
        position: { x: 200, y: 30 },
      }),
    );
    scene.addChild(
      new Shape({
        name: "learnProgressFill",
        rect: { width: 0, height: 4 },
        cornerRadius: 2,
        fillColor: ACCENT,
        position: { x: 20, y: 30 },
        anchorPoint: { x: 0, y: 0.5 },
      }),
    );

    scene.addChild(
      new Label({
        name: "learnPhaseLabel",
        text: "",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 60 },
      }),
    );

    // Card background
    scene.addChild(
      new Shape({
        name: "learnCard",
        rect: { width: 320, height: 340 },
        cornerRadius: 20,
        fillColor: CARD_BG,
        position: { x: 200, y: 310 },
      }),
    );

    // Item name
    scene.addChild(
      new Label({
        name: "learnItemLabel",
        text: "",
        fontSize: 32,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 220 },
        preferredMaxLayoutWidth: 280,
      }),
    );

    // Price
    scene.addChild(
      new Label({
        name: "learnPriceLabel",
        text: "",
        fontSize: 42,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 290 },
      }),
    );

    // "Is this a good price?" question
    scene.addChild(
      new Label({
        name: "learnQuestionLabel",
        text: "Is this a good price?",
        fontSize: 16,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 360 },
      }),
    );

    // Yes button
    const yesBtnBg = new Shape({
      name: "learnYesBtnBg",
      rect: { width: 100, height: 40 },
      cornerRadius: 20,
      fillColor: [220, 220, 225, 1],
      position: { x: 145, y: 415 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(yesBtnBg);
    scene.addChild(
      new Label({
        name: "learnYesBtnLabel",
        text: "Yes",
        fontSize: 16,
        fontColor: TEXT_PRIMARY,
        position: { x: 145, y: 415 },
        zPosition: 11,
      }),
    );

    // No button
    const noBtnBg = new Shape({
      name: "learnNoBtnBg",
      rect: { width: 100, height: 40 },
      cornerRadius: 20,
      fillColor: [220, 220, 225, 1],
      position: { x: 255, y: 415 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(noBtnBg);
    scene.addChild(
      new Label({
        name: "learnNoBtnLabel",
        text: "No",
        fontSize: 16,
        fontColor: TEXT_PRIMARY,
        position: { x: 255, y: 415 },
        zPosition: 11,
      }),
    );

    // Timer countdown indicator (thin bar below card)
    scene.addChild(
      new Shape({
        name: "learnTimerBar",
        rect: { width: 320, height: 3 },
        cornerRadius: 1,
        fillColor: ACCENT,
        position: { x: 200, y: 490 },
      }),
    );

    yesBtnBg.onTapDown(() => this._handleGoodPrice(1));
    noBtnBg.onTapDown(() => this._handleGoodPrice(0));

    scene.onAppear(() => {
      this._showLearningItem(0);
    });
  }

  // ─── Transition Scene ────────────────────────────────────

  _buildTransitionScene() {
    const scene = new Scene({ name: "transition", backgroundColor: SCENE_BG });
    this.addScene(scene);

    scene.addChild(
      new Label({
        text: "Part 2: Recognition",
        fontSize: 28,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 200 },
      }),
    );

    scene.addChild(
      new Shape({
        rect: { width: 200, height: 3 },
        fillColor: ACCENT,
        position: { x: 200, y: 230 },
      }),
    );

    scene.addChild(
      new Label({
        text: "You will now see each item\nwith two prices.\n\nPlease select the price that\nwas originally paired with\nthat item.",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 380 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    const beginBtnBg = new Shape({
      name: "transitionBeginBtn",
      rect: { width: 240, height: 54 },
      cornerRadius: 27,
      fillColor: START_BUTTON_BG,
      position: { x: 200, y: 600 },
      isUserInteractionEnabled: true,
      zPosition: 10,
      hidden: true,
    });
    scene.addChild(beginBtnBg);
    scene.addChild(
      new Label({
        name: "transitionBeginLabel",
        text: "BEGIN",
        fontSize: 20,
        fontColor: BUTTON_TEXT,
        position: { x: 200, y: 600 },
        zPosition: 11,
        hidden: true,
      }),
    );
    beginBtnBg.onTapDown(() => {
      this.presentScene("recognition", Transition.none());
    });

    scene.onAppear(() => {
      const btn = this._getNode("transitionBeginBtn");
      const lbl = this._getNode("transitionBeginLabel");
      const self = this;
      scene.run(
        Action.sequence([
          Action.wait({ duration: 3000 }),
          Action.custom({
            callback: () => {
              btn.hidden = false;
              lbl.hidden = false;
            },
          }),
          Action.wait({ duration: 12000 }),
          Action.custom({
            callback: () => {
              if (self.currentScene && self.currentScene.name === "transition") {
                self.presentScene("recognition", Transition.none());
              }
            },
          }),
        ]),
      );
    });
  }

  // ─── Recognition Scene ───────────────────────────────────

  _buildRecognitionScene() {
    const scene = new Scene({
      name: "recognition",
      backgroundColor: SCENE_BG,
    });
    this.addScene(scene);

    // Progress bar
    scene.addChild(
      new Shape({
        name: "recogProgressBg",
        rect: { width: 360, height: 4 },
        cornerRadius: 2,
        fillColor: PROGRESS_BG,
        position: { x: 200, y: 30 },
      }),
    );
    scene.addChild(
      new Shape({
        name: "recogProgressFill",
        rect: { width: 0, height: 4 },
        cornerRadius: 2,
        fillColor: ACCENT,
        position: { x: 20, y: 30 },
        anchorPoint: { x: 0, y: 0.5 },
      }),
    );

    scene.addChild(
      new Label({
        name: "recogPhaseLabel",
        text: "",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 60 },
      }),
    );

    // Item name
    scene.addChild(
      new Label({
        name: "recogItemLabel",
        text: "",
        fontSize: 34,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 200 },
        preferredMaxLayoutWidth: 360,
      }),
    );

    // Question
    scene.addChild(
      new Label({
        name: "recogQuestionLabel",
        text: "What was the price?",
        fontSize: 18,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 260 },
      }),
    );

    // Price button 1 (top)
    const btn1Bg = new Shape({
      name: "recogBtn1Bg",
      rect: { width: 280, height: 70 },
      cornerRadius: 16,
      fillColor: CARD_BG,
      position: { x: 200, y: 390 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(btn1Bg);
    scene.addChild(
      new Label({
        name: "recogBtn1Label",
        text: "",
        fontSize: 28,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 390 },
        zPosition: 11,
      }),
    );

    // Price button 2 (bottom)
    const btn2Bg = new Shape({
      name: "recogBtn2Bg",
      rect: { width: 280, height: 70 },
      cornerRadius: 16,
      fillColor: CARD_BG,
      position: { x: 200, y: 500 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(btn2Bg);
    scene.addChild(
      new Label({
        name: "recogBtn2Label",
        text: "",
        fontSize: 28,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 500 },
        zPosition: 11,
      }),
    );

    // Feedback label (hidden by default)
    scene.addChild(
      new Label({
        name: "recogFeedbackLabel",
        text: "",
        fontSize: 16,
        fontColor: GREEN,
        position: { x: 200, y: 600 },
        hidden: true,
      }),
    );

    btn1Bg.onTapDown(() => this._handleRecognitionChoice(0));
    btn2Bg.onTapDown(() => this._handleRecognitionChoice(1));

    scene.onAppear(() => {
      this._showRecognitionItem(0);
    });
  }

  // ─── End Scene ───────────────────────────────────────────

  _buildEndScene() {
    const scene = new Scene({ name: "end", backgroundColor: SCENE_BG });
    this.addScene(scene);

    scene.addChild(
      new Label({
        text: "Test Complete",
        fontSize: 30,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 340 },
      }),
    );

    scene.addChild(
      new Shape({
        rect: { width: 120, height: 3 },
        fillColor: ACCENT,
        position: { x: 200, y: 370 },
      }),
    );

    scene.addChild(
      new Label({
        text: "Thank you for participating.",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 420 },
      }),
    );

    const self = this;
    scene.onAppear(() => {
      scene.run(
        Action.sequence([
          Action.wait({ duration: 3000 }),
          Action.custom({
            callback: () => {
              self.end();
            },
          }),
        ]),
      );
    });
  }

  // ─── Test Logic ──────────────────────────────────────────

  _startTest() {
    const numItems = this.getParameter("number_of_items");

    const excludedParam = this.getParameter("excluded_items");
    const excludedItems = excludedParam
      ? excludedParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const usedPricesParam = this.getParameter("used_item_prices");
    let usedItemPrices = {};
    try {
      usedItemPrices =
        typeof usedPricesParam === "string"
          ? JSON.parse(usedPricesParam)
          : usedPricesParam || {};
    } catch (e) {
      console.warn("[Prices] Invalid used_item_prices JSON, ignoring:", e);
    }

    this._priceSet = generatePriceSet(
      numItems,
      this._minPriceDistance,
      excludedItems,
      usedItemPrices,
    );
    this._recognitionOrder = shuffleArray(
      this._priceSet.map((_, i) => i),
    );
    this._learningIndex = 0;
    this._recognitionIndex = 0;
    this._goodPriceResponses = new Array(numItems).fill(null);
    this._learningTimestamps = new Array(numItems).fill(0);
    this._testStartTime = Timer.now();

    this.presentScene("countdown", Transition.none());
  }

  // ─── Learning Phase ──────────────────────────────────────

  _showLearningItem(index) {
    const numItems = this.getParameter("number_of_items");
    if (index >= numItems) {
      this.presentScene("transition", Transition.none());
      return;
    }

    this._learningIndex = index;
    this._responded = false;

    const item = this._priceSet[index];
    const progressFraction = (index + 1) / numItems;

    const progressFill = this._getNode("learnProgressFill");
    progressFill.size = { width: 360 * progressFraction, height: 4 };

    const phaseLabel = this._getNode("learnPhaseLabel");
    phaseLabel.text = `Item ${index + 1} of ${numItems}`;

    const itemLabel = this._getNode("learnItemLabel");
    itemLabel.text = item.item;

    const priceLabel = this._getNode("learnPriceLabel");
    priceLabel.text = this._formatPrice(item.price);

    // Show/hide good price question
    const showQuestion = this.getParameter("show_good_price_question");
    const questionLabel = this._getNode("learnQuestionLabel");
    const yesBg = this._getNode("learnYesBtnBg");
    const yesLbl = this._getNode("learnYesBtnLabel");
    const noBg = this._getNode("learnNoBtnBg");
    const noLbl = this._getNode("learnNoBtnLabel");

    questionLabel.hidden = !showQuestion;
    yesBg.hidden = !showQuestion;
    yesLbl.hidden = !showQuestion;
    noBg.hidden = !showQuestion;
    noLbl.hidden = !showQuestion;

    // Reset button colors
    yesBg.fillColor = [220, 220, 225, 1];
    noBg.fillColor = [220, 220, 225, 1];

    // Reset timer bar
    const timerBar = this._getNode("learnTimerBar");
    timerBar.size = { width: 320, height: 3 };

    this._learningTimestamps[index] = Timer.now();

    // Animate timer bar shrinking and then advance
    const self = this;
    const duration = this.getParameter("learning_duration_ms");
    const learnScene = this._getScene("learning");
    learnScene.removeAllActions();

    learnScene.run(
      Action.sequence([
        Action.wait({ duration: duration }),
        Action.custom({
          callback: () => {
            if (self._goodPriceResponses[index] === null) {
              self._goodPriceResponses[index] = showQuestion ? 99 : null;
            }
            self._showLearningItem(index + 1);
          },
        }),
      ]),
      "learn-timer",
    );

    // Animate the timer bar width shrinking
    const steps = 60;
    const stepDuration = duration / steps;
    let currentStep = 0;
    const shrinkTimer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        clearInterval(shrinkTimer);
        return;
      }
      const fraction = 1 - currentStep / steps;
      timerBar.size = { width: Math.max(0, 320 * fraction), height: 3 };
    }, stepDuration);

    this._learnShrinkTimer = shrinkTimer;
  }

  _handleGoodPrice(response) {
    if (this._responded) return;
    this._responded = true;

    const index = this._learningIndex;
    this._goodPriceResponses[index] = response;

    // Visual feedback: highlight selected button
    const yesBg = this._getNode("learnYesBtnBg");
    const noBg = this._getNode("learnNoBtnBg");
    if (response === 1) {
      yesBg.fillColor = ACCENT;
    } else {
      noBg.fillColor = ACCENT;
    }
  }

  // ─── Recognition Phase ───────────────────────────────────

  _showRecognitionItem(orderIndex) {
    const numItems = this.getParameter("number_of_items");
    if (orderIndex >= numItems) {
      this.presentScene("end", Transition.none());
      return;
    }

    this._recognitionIndex = orderIndex;
    this._responded = false;

    const dataIndex = this._recognitionOrder[orderIndex];
    const item = this._priceSet[dataIndex];
    const progressFraction = (orderIndex + 1) / numItems;

    const progressFill = this._getNode("recogProgressFill");
    progressFill.size = { width: 360 * progressFraction, height: 4 };

    const phaseLabel = this._getNode("recogPhaseLabel");
    phaseLabel.text = `Item ${orderIndex + 1} of ${numItems}`;

    const itemLabel = this._getNode("recogItemLabel");
    itemLabel.text = item.item;

    // Randomize which position has the correct price
    const correctPosition = RandomDraws.singleFromRange(0, 1);
    this._currentCorrectPosition = correctPosition;
    this._currentDataIndex = dataIndex;

    const btn1Label = this._getNode("recogBtn1Label");
    const btn2Label = this._getNode("recogBtn2Label");

    if (correctPosition === 0) {
      btn1Label.text = this._formatPrice(item.price);
      btn2Label.text = this._formatPrice(item.alt);
    } else {
      btn1Label.text = this._formatPrice(item.alt);
      btn2Label.text = this._formatPrice(item.price);
    }

    // Reset button appearance
    const btn1Bg = this._getNode("recogBtn1Bg");
    const btn2Bg = this._getNode("recogBtn2Bg");
    btn1Bg.fillColor = CARD_BG;
    btn2Bg.fillColor = CARD_BG;
    btn1Label.fontColor = TEXT_PRIMARY;
    btn2Label.fontColor = TEXT_PRIMARY;
    btn1Bg.isUserInteractionEnabled = true;
    btn2Bg.isUserInteractionEnabled = true;

    const feedbackLabel = this._getNode("recogFeedbackLabel");
    feedbackLabel.hidden = true;

    this._currentRecognitionDisplayTime = Timer.now();
  }

  _handleRecognitionChoice(selectedPosition) {
    if (this._responded) return;
    this._responded = true;

    const responseTime = Timer.now();
    const rt = responseTime - this._currentRecognitionDisplayTime;
    const isCorrect = selectedPosition === this._currentCorrectPosition;
    const dataIndex = this._currentDataIndex;
    const item = this._priceSet[dataIndex];

    // Disable buttons
    const btn1Bg = this._getNode("recogBtn1Bg");
    const btn2Bg = this._getNode("recogBtn2Bg");
    btn1Bg.isUserInteractionEnabled = false;
    btn2Bg.isUserInteractionEnabled = false;

    // Brief visual feedback
    const selectedBg =
      selectedPosition === 0
        ? this._getNode("recogBtn1Bg")
        : this._getNode("recogBtn2Bg");
    selectedBg.fillColor = isCorrect ? [200, 240, 200, 1] : [240, 200, 200, 1];

    // Record trial data
    this.addTrialData("trial_index", this.trialIndex);
    this.addTrialData("item", item.item);
    this.addTrialData("correct_price", this._formatPrice(item.price));
    this.addTrialData("distractor_price", this._formatPrice(item.alt));
    this.addTrialData(
      "good_price_response",
      this._goodPriceResponses[dataIndex],
    );
    this.addTrialData("correct_position", this._currentCorrectPosition);
    this.addTrialData("selected_position", selectedPosition);
    this.addTrialData("is_correct", isCorrect);
    this.addTrialData("response_time_ms", Math.round(rt));
    this.addTrialData(
      "learning_display_timestamp",
      Math.round(this._learningTimestamps[dataIndex]),
    );
    this.addTrialData(
      "recognition_display_timestamp",
      Math.round(this._currentRecognitionDisplayTime),
    );
    this.addTrialData("response_timestamp", Math.round(responseTime));
    this.addTrialData("locale", this._locale);
    this.addTrialData("currency", this._currencyCode);
    this.trialComplete();

    // Advance after brief delay
    const self = this;
    const recogScene = this._getScene("recognition");
    recogScene.run(
      Action.sequence([
        Action.wait({ duration: 400 }),
        Action.custom({
          callback: () => {
            self._showRecognitionItem(self._recognitionIndex + 1);
          },
        }),
      ]),
    );
  }

  // ─── Currency ────────────────────────────────────────────

  _resolveCurrency() {
    const localeParam = this.getParameter("locale");
    const currencyParam = this.getParameter("currency");

    if (localeParam && localeParam !== "auto") {
      this._locale = localeParam;
    } else {
      this._locale = this._detectLocale();
    }

    if (currencyParam && currencyParam !== "auto") {
      this._currencyCode = currencyParam.toUpperCase();
    } else {
      this._currencyCode = this._currencyFromLocale(this._locale);
    }

    this._isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(this._currencyCode);

    this._priceFormatter = new Intl.NumberFormat(this._locale, {
      style: "currency",
      currency: this._currencyCode,
      minimumFractionDigits: this._isZeroDecimal ? 0 : 2,
      maximumFractionDigits: this._isZeroDecimal ? 0 : 2,
    });

    // Convert the USD-denominated minimum distance to internal price units.
    // Internal prices live in the 1–9 range for every currency. For decimal
    // currencies 1 internal unit = 1 local unit (e.g. £1). For zero-decimal
    // currencies 1 internal unit = 100 display units (e.g. ¥100), so we
    // divide by 100 after converting.
    const distUsd = this.getParameter("min_price_distance_usd");
    const rate = USD_EXCHANGE_RATES[this._currencyCode] || 1.0;
    let rawDist = distUsd * rate;
    if (this._isZeroDecimal) {
      rawDist /= 100;
    }
    this._minPriceDistance = Math.min(rawDist, MAX_RAW_DISTANCE);

    console.log(
      `[Prices] locale=${this._locale}, currency=${this._currencyCode}, ` +
        `minDistance=${this._minPriceDistance.toFixed(2)} raw ` +
        `(${distUsd} USD × ${rate} rate)`,
    );
  }

  _detectLocale() {
    // navigator.languages often contains region-specific entries (e.g.
    // ["en-GB", "en"]) even when navigator.language is just "en".
    // Prefer the first entry that has a known currency mapping.
    const candidates = navigator.languages || [];
    for (const lang of candidates) {
      if (LOCALE_TO_CURRENCY[lang]) return lang;
      const lower = lang.toLowerCase();
      for (const key of Object.keys(LOCALE_TO_CURRENCY)) {
        if (key.toLowerCase() === lower) return lang;
      }
    }
    return navigator.language || navigator.userLanguage || "en-GB";
  }

  _currencyFromLocale(locale) {
    const exact = LOCALE_TO_CURRENCY[locale];
    if (exact) return exact;

    const lower = locale.toLowerCase();
    for (const [key, val] of Object.entries(LOCALE_TO_CURRENCY)) {
      if (key.toLowerCase() === lower) return val;
    }

    const lang = locale.split("-")[0].toLowerCase();
    return LANGUAGE_FALLBACK_CURRENCY[lang] || "GBP";
  }

  _formatPrice(value) {
    const scaled = this._isZeroDecimal ? Math.round(value * 100) : value;
    return this._priceFormatter.format(scaled);
  }

  // ─── Helpers ─────────────────────────────────────────────

  _getNode(name) {
    const found = this.nodes.filter((n) => n.name === name);
    if (found.length === 0) {
      throw new Error(`Node not found: ${name}`);
    }
    return found[0];
  }

  _getScene(name) {
    return this.sceneManager.scenes.filter((s) => s.name === name)[0];
  }
}

var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

const Twilio = require("twilio");
const extName = require("ext-name");
const urlUtil = require("url");
const fs = require("fs");
const config = require("./config.js");

const PUBLIC_DIR = "./public/mms_images";
const {
  twilioPhoneNumber,
  twilioAccountSid,
  twilioAuthToken,
  cloudinaryKey,
  cloudinarySecret,
} = config;
const { MessagingResponse } = Twilio.twiml;
const { NODE_ENV } = process.env;
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dzxvuycat",
  api_key: cloudinaryKey,
  api_secret: cloudinarySecret,
});

function MessagingRouter() {
  let twilioClient;
  let images = [];

  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(path.resolve(PUBLIC_DIR));
  }

  function getTwilioClient() {
    return twilioClient || new Twilio(twilioAccountSid, twilioAuthToken);
  }

  async function SaveMedia(mediaItem) {
    const { mediaSid, MessageSid, mediaUrl, extension, filename } = mediaItem;
    // cloudinary picks up env and is now configured
    console.log(cloudinary.config().cloud_name);
    let resourceType = "image";

    if (
      extension === ".mp4" ||
      extension === ".m4a" ||
      extension === ".f4v" ||
      extension === ".m4b" ||
      extension === ".mov"
    ) {
      resourceType = "video";
    }

    cloudinary.uploader
      .upload(mediaUrl, {
        // image is the default resource type if you don't specify
        resource_type: resourceType,
      })
      .then((result) => {
        // JSON.stringify will provide a formatted string
        // 1st param is the value to be output
        // 2nd param null is a function that can be applied to the output
        // 3rd param is the number of space characters to use for whitespace in formatting the output
        console.log("success", JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.log("error", JSON.stringify(error, null, 2));
      });
  }

  async function handleIncomingSMS(req, res) {
    // const { body } = req;
    // const { NumMedia, From: SenderNumber, MessageSid } = body;
    // let saveOperations = [];
    // const mediaItems = [];

    // for (var i = 0; i < NumMedia; i++) {
    //   // eslint-disable-line
    //   const mediaUrl = body[`MediaUrl${i}`];
    //   const contentType = body[`MediaContentType${i}`];
    //   const extension = extName.mime(contentType)[0].ext;
    //   const mediaSid = path.basename(urlUtil.parse(mediaUrl).pathname);
    //   const filename = `${mediaSid}.${extension}`;

    //   mediaItems.push({ mediaSid, MessageSid, mediaUrl, filename, extension });
    //   saveOperations = mediaItems.map((mediaItem) => SaveMedia(mediaItem));
    // }

    // await Promise.all(saveOperations);

    const messageBody =
      NumMedia === 0
        ? "Send us an image!"
        : `Thanks for sending us ${NumMedia} file(s)`;

    const response = new MessagingResponse();
    response.message(
      {
        from: twilioPhoneNumber,
        to: SenderNumber,
      },
      messageBody
    );

    return res.send(response.toString()).status(200);
  }

  function getRecentImages() {
    return images;
  }

  function clearRecentImages() {
    images = [];
  }

  function fetchRecentImages(req, res) {
    res.status(200).send(getRecentImages());
    clearRecentImages();
  }

  /**
   * Initialize router and define routes.
   */
  const router = express.Router();
  router.post("/incoming", handleIncomingSMS);
  router.get("/config", (req, res) => {
    res.status(200).send({ twilioPhoneNumber });
  });
  router.get("/images", fetchRecentImages);

  return router;
}

var app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", MessagingRouter);

module.exports = app;

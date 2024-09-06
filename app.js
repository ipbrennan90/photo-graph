var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const Twilio = require('twilio');
const extName = require('ext-name');
const urlUtil = require('url');
const fs = require('fs');
const config = require('./config.js');

const PUBLIC_DIR = './public/mms_images';
const { twilioPhoneNumber, twilioAccountSid, twilioAuthToken } = config;
const { MessagingResponse } = Twilio.twiml;
const { NODE_ENV } = process.env;

function MessagingRouter() {
  let twilioClient;
  let images = [];

  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(path.resolve(PUBLIC_DIR));
  }

  function getTwilioClient() {
    return twilioClient || new Twilio(twilioAccountSid, twilioAuthToken);
  }

  function deleteMediaItem(mediaItem) {
    const client = getTwilioClient();

    return client
      .api.accounts(twilioAccountSid)
      .messages(mediaItem.MessageSid)
      .media(mediaItem.mediaSid).remove();
  }

  async function SaveMedia(mediaItem) {

  }


  async function handleIncomingSMS(req, res) {
    const { body } = req;
    const { NumMedia, From: SenderNumber, MessageSid } = body;
    let saveOperations = [];
    const mediaItems = [];

    for (var i = 0; i < NumMedia; i++) {  // eslint-disable-line
      const mediaUrl = body[`MediaUrl${i}`];
      const contentType = body[`MediaContentType${i}`];
      const extension = extName.mime(contentType)[0].ext;
      const mediaSid = path.basename(urlUtil.parse(mediaUrl).pathname);
      const filename = `${mediaSid}.${extension}`;

      mediaItems.push({ mediaSid, MessageSid, mediaUrl, filename });
      saveOperations = mediaItems.map(mediaItem => SaveMedia(mediaItem));
    }

    await Promise.all(saveOperations);

    const messageBody = NumMedia === 0 ?
    'Send us an image!' :
    `Thanks for sending us ${NumMedia} file(s)`;

    const response = new MessagingResponse();
    response.message({
      from: twilioPhoneNumber,
      to: SenderNumber,
    }, messageBody);

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
  router.post('/incoming', handleIncomingSMS);
  router.get('/config', (req, res) => {
    res.status(200).send({ twilioPhoneNumber });
  });
  router.get('/images', fetchRecentImages);

  return router;
}

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', MessagingRouter);




module.exports = app;

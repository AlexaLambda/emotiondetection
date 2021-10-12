const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
var Spotify = require('node-spotify-api');
const config = new AWS.Config({
 accessKeyId: process.env.AWS_ACCESS_KEY_ID,
 secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
 region: process.env.AWS_REGION
})
const rekognition = new AWS.Rekognition();
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const bucket = 'myemotiondetected'; // the bucketname without s3://
let s3Image = "";
let song_url ;
const STREAMS = [
  {
    token: '1',
    url: 'https://streaming.radionomy.com/-ibizaglobalradio-?lang=en-US&appName=iTunes.m3u',
    metadata: {
      title: 'Stream One',
      subtitle: 'A subtitle for stream one',
      art: {
        sources: [
          {
            contentDescription: 'example image',
            url: 'https://s3.amazonaws.com/cdn.dabblelab.com/img/audiostream-starter-512x512.png',
            widthPixels: 512,
            heightPixels: 512,
          },
        ],
      },
      backgroundImage: {
        sources: [
          {
            contentDescription: 'example image',
            url: 'https://s3.amazonaws.com/cdn.dabblelab.com/img/wayfarer-on-beach-1200x800.png',
            widthPixels: 1200,
            heightPixels: 800,
          },
        ],
      },
    },
  },
];


async function detectEmotionForImageInS3() {  
    console.log(`1. getImageFromBucket is start: ${bucket}`);
    let emotionDetected = {};
    const params = {
      Bucket: bucket,
    };
    // uploadload image() from raspary pi selfie
    
    const response = await s3.listObjects(params).promise().then(data => {
         s3Image = data.Contents[0].Key.toString('utf-8');
         console.log(`2. getImageFromBucket listObjects: ${s3Image}`);
    });    
    const result = await callrekognitionAPI().then(emotion => {
         emotionDetected = emotion;
         console.log(`3. detectEmotion: ${emotionDetected}`);
    });
    return emotionDetected;
}


function callrekognitionAPI(){    
    console.log(`4. detectEmotion() for: ${bucket}`);
    let emotionLocal = '';
    const params = {
         Image: {
           S3Object: {
             Bucket: bucket,
             Name: s3Image
           },
         },
         Attributes: ['ALL']
   };
 
   return rekognition.detectFaces(params).promise(
           setTimeout(() => {
            console.log("5. waiting to get image from s3");
           }, 1500)).then(result => {       
             result.FaceDetails.forEach(data => {
             emotionLocal = data.Emotions[0].Type;
          });
          return emotionLocal;
      }).catch(error => {
          console.log(error);
        return error;
      });
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    
    //capture image in EB tool
    
    handle(handlerInput) {
        
        const speakOutput = "Welcome! it is good to here your voice";
        console.log(speakOutput);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .addDelegateDirective({
                    name: 'EmotionIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
            .withSimpleCard(
              "EmotionDetection",
              "TakepictureAndloadImage")
            .getResponse();
    } 
        
};

const EmotionIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'EmotionIntent';
    },

    handle(handlerInput) {
      
      
      return detectEmotionForImageInS3().then(emotion => {
        console.log("started with detecting : ",emotion);
  
        const speakOutput = 'you seems to be '  + emotion + "!  <break time= \"2s\" /> how are you?";
        const repromt = 'How you feeling';

        
          const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
          sessionAttributes.emotionType = emotion;
          handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
              return handlerInput.responseBuilder
                  .speak(speakOutput)
                  .addDelegateDirective({
                    name: 'DetectEmotionIntent',
                    confirmationStatus: 'NONE'
                     })
                  .getResponse();
        }).catch(error => {
            return error;
        })
  }
};


const DetectEmotionIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'DetectEmotionIntent';
    },


 handle(handlerInput) {
        
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let speakOutput = '';
        if(sessionAttributes.emotionType == 'ANGRY')
        {
            sessionAttributes.YesNofrom = 'music'
            speakOutput =  'Let\'s make you feel calm, would you like to play some music?';
           
        }
        
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    } 

        
};


const YesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent');
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let speakOutput = '';
        let sessionEnd = false;
    if(sessionAttributes.emotionType == 'ANGRY')
    {
        if(sessionAttributes.YesNofrom == 'music')
        {
            speakOutput = 'Okay I will play music!';

        }
        else if (sessionAttributes.YesNofrom == 'joke')
        {
            speakOutput = 'Okay, Here is a Joke. ' + "Why don’t scientists trust atoms?" + "<break time= \"2s\" /> Because they make up everything.";
        }
        else if(sessionAttributes.YesNofrom == 'joke')
        {
            speakOutput = 'Would you like to listen to another joke' + "Why doesn’t the sun go to college? Because it has a million degrees"
        }
            
        else if(sessionAttributes.YesNofrom == 'walk')
        {
            speakOutput = 'Okay';
        }
    }
        
    else if(sessionAttributes.emotionType == 'SAD')
    {
        
    }
    
    else
    {
        
    }
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    return handlerInput.responseBuilder
        .speak(speakOutput)
        .withShouldEndSession(true)
        .getResponse();
    }
};

const NoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent');
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let speakOutput = '';
        let sessionEnd = false;
   
        if(sessionAttributes.emotionType == 'ANGRY')
        {
            if(sessionAttributes.YesNofrom == 'music')
            {
                speakOutput = 'Okay! How about a joke then?';
                sessionAttributes.YesNofrom = 'joke'
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
            }
            
            else if (sessionAttributes.YesNofrom == 'joke')
            {
                speakOutput = 'Lets take a small walk and relax';
                sessionAttributes.YesNofrom = 'walk'
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
            }
            
            else 
            {
                speakOutput = 'I have nothing else to offer';
                sessionEnd = true;
            }
        }
        
        else if (sessionAttributes.emotionType == 'SAD')
        {
            
        }
       
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(sessionEnd)
            .getResponse();
    }
};


const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};


/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        DetectEmotionIntentHandler,
        EmotionIntentHandler,
        YesIntentHandler,
        NoIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .lambda();

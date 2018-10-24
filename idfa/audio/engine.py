import os
import sys
import argparse


from pythonosc import osc_message_builder
from pythonosc import udp_client
from server import Server
import shutil
import asyncio

from ms_speech import MSSpeech
from google_speech import GoogleSpeech
from script import Script

sys.path.append(os.path.abspath('./emotion'))

from offline_ser import LiveSer
from mental_state import MentalState


# Load English tokenizer, tagger, parser, NER and word vectors
#nlp = spacy.load('en')
#print("Loaded English NLP")


def emotion_update(data):
    print("Emotion update! {}".format(data))
    if (data["status"] == "silence"):
        mental_state.update_silence()
    else:
        mental_state.update_emotion(data["analysis"])
        
    conc = asyncio.run_coroutine_threadsafe(server.emotion_update(data, mental_state.get_current_state()), main_loop)

def gain_update(min, max):
    print("Update gain! {} : {}".format(min, max))
    live_ser.feat_ext.min = float(min)
    live_ser.feat_ext.max = float(max)

def speech_text(text):
    print("Speech! {}".format(text))
    t2i_client.send_message("/speech", text)
    match = script.match(text)
    if match:
        if match['match'] < 0.5:
            print("Match! {}".format(match))
            line = script.data["script-lines"][match["index"]]
            if "triggers-gan" in line:
                trigger = line["triggers-gan"]
                current_metnal_state = mental_state.get_current_state()
                if current_metnal_state in trigger:
                    shutil.copyfile(
                            "gan_responses/{}-{}.wav".format(
                                match['index'], 
                                current_metnal_state
                            ), 
                            "tmp/gan_response.wav"
                    )
                    print("Copied")
                    voice_client.send_message("/speech/reload",1)
                    voice_client.send_message("/speech/play",1)

        mental_state.update_script_match(match['match'])
    else:
        mental_state.update_script_match(1)
        



if __name__ == '__main__':

    parser = argparse.ArgumentParser()
    parser.add_argument("-d_id", "--device_id", dest= 'device_id', type=int, help="a device id for microphone", default=None)

    #automatic gain normalisation
    parser.add_argument("-g_min", "--gain_min", dest= 'g_min', type=float, help="the min value of automatic gain normalisation")
    parser.add_argument("-g_max", "--gain_max", dest= 'g_max', type=float, help="the max value of automatic gain normalisation")

    script = Script()
    script.load_space()

    args = parser.parse_args()
    args.stop = False

    args.callback = emotion_update

    live_ser = LiveSer()
    live_ser.run(args)

    ms_speech = MSSpeech()

    t2i_client = udp_client.SimpleUDPClient("127.0.0.1", 3838)
    voice_client = udp_client.SimpleUDPClient("127.0.0.1", 57120)

    mental_state = MentalState()

    #google_speech = GoogleSpeech()
    #google_speech.say("Hi")
    #asyncio.get_event_loop().run_until_complete(ms_speech.say("I masturbate 50 times a day to naked nerdy men"))

    server = Server(ms_speech, gain_update, speech_text)

    main_loop = asyncio.get_event_loop()

    asyncio.get_event_loop().run_until_complete(server.start())

    try:
        asyncio.get_event_loop().run_forever()
    except KeyboardInterrupt:
        print("Stopping everything")
        args.stop = True







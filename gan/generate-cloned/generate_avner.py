from pathlib import Path
#RTVC_PATH = Path('C:/Real-Time-Voice-Cloning')
RTVC_PATH = Path('/home/avnerus/Code/Real-Time-Voice-Cloning')

import sys
sys.path.append(str(RTVC_PATH))
sys.path.append('../')

import argparse
from synthesizer.inference import Synthesizer
from encoder import inference as encoder
from vocoder import inference as vocoder
import numpy as np
import librosa
import scipy
from script import Script

parser = argparse.ArgumentParser(description='Marrow line generator using cloned voices')
parser.add_argument('character', metavar='Character name', help='Character name')
parser.add_argument('voice_sample', metavar='Voice sample file', help='Voice sample file')
parser.add_argument('--only-index', metavar='Only specific index' , help='Generate only this index')
parser.add_argument('--hall', action='store_true' , help='Generate for hall')
args = parser.parse_args()


if __name__ == '__main__':
    print(args.voice_sample)

    encoder_weights = RTVC_PATH / "encoder/saved_models/pretrained.pt"
    vocoder_weights = RTVC_PATH / "vocoder/saved_models/pretrained/pretrained.pt"
    syn_dir = RTVC_PATH / "synthesizer/saved_models/logs-pretrained/taco_pretrained"

    encoder.load_model(encoder_weights)
    synthesizer = Synthesizer(syn_dir)
    vocoder.load_model(vocoder_weights)

    original_wav, sampling_rate = librosa.load(args.voice_sample)
    print("Voice sampling rate: {}".format(sampling_rate))
    print("Default hop size: {}".format(Synthesizer.hparams.hop_size))

    encoder_wav = encoder.preprocess_wav(Path(args.voice_sample))
    embed, partial_embeds, _ = encoder.embed_utterance(encoder_wav, return_partials=True)

    if args.hall:
        script_file_name = '../marrow_hall.json'
    else:
        script_file_name = '../marrow_script.json'

    script = Script(script_file = script_file_name, load_nlp = False)

    if args.only_index:
        only_index = int(args.only_index)
    else:
        only_index = None

    index = 0
    for line in script.data["script-lines"]:
        try:
            if "speaker" in line and line["speaker"] == "house" :
                pass
                #utterance = line["lines"]
                #dmoz_tts.say(utterance, "gan_new/house_{}.wav".format(index))
            if "timeout" in line:
                line["in-ear"] = line["timeout"]
            if "in-ear" in line:
                inears = line["in-ear"]
                for inear in inears:
                    target = inear["target"]
                    if target == args.character and (only_index is None or index == only_index):
                        utterance = inear["lines"]
                        texts = [part['text'] for part in utterance]
                        embeds = np.stack([embed] * len(texts))
                        pauses = [(part['pause'] / 10) if 'pause' in part else 1 for part in utterance]
                        specs = synthesizer.synthesize_spectrograms(texts, embeds)
                        breaks = [spec.shape[1] for spec in specs]
                        b_ends = np.cumsum(np.array(breaks) * Synthesizer.hparams.hop_size)
                        b_starts = np.concatenate(([0], b_ends[:-1]))
                        spec = np.concatenate(specs, axis=1)
                        wav = vocoder.infer_waveform(spec)
                        wavs = [wav[start:end] for start, end, in zip(b_starts, b_ends)]
                        breaks = [np.zeros(int(0.15 * Synthesizer.sample_rate * pause_length)) for pause_length in pauses] 
                        final_wav = np.concatenate([i for w, b in zip(wavs, breaks) for i in (w, b)])

                        if args.hall:
                            output_file = "results/in_ear_{}_hall.wav".format(target)
                        else:
                            output_file = "results/in_ear_{}_{}.wav".format(target,index)

                        scipy.io.wavfile.write(output_file, Synthesizer.sample_rate, final_wav)

                    #moz_tts.say(utterance, "gan_new/in_ear_{}_{}.wav".format(target,index))
        except Exception as e:
            print("Error: {}, skipping.".format(str(e)))
            continue
        finally:
            index += 1
    #text = "This is not my own voice, but it's quite close isn't it?"
    #specs = synthesizer.synthesize_spectrograms([text], [embed])
    #generated_wav = vocoder.infer_waveform(specs[0])
    #generated_wav = np.pad(generated_wav, (0, synthesizer.sample_rate), mode="constant")
    #print("Done")
    #scipy.io.wavfile.write('output.wav', Synthesizer.sample_rate, generated_wav)



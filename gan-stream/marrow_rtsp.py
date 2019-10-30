#!/usr/bin/env python
# -*- coding: utf-8

import sys, os, time, re
import cv2
import numpy as np
import pickle
import PIL.Image
import dnnlib
import dnnlib.tflib as tflib
from threading import Thread
import queue
import time
import random

#sys.path.append('/opt/anaconda1anaconda2anaconda3/share/gir-1.0')

import gi
gi.require_version('Gst', '1.0')
gi.require_version('GstRtspServer', '1.0')
from gi.repository import GObject, GIRepository,Gst,GstRtspServer

class SampleGenerator(GstRtspServer.RTSPMediaFactory):
	def __init__(self, queue, **properties):
            print("SampleGenerator init")
            super(SampleGenerator, self).__init__(**properties)
            print(queue)
            self.queue = queue
            self.fps = 30
            self.duration = 1 / self.fps * Gst.SECOND
            self.number_frames = 0
            self.launch_string = 'appsrc name=source is-live=true block=true format=GST_FORMAT_TIME ' \
                 'caps=video/x-raw,format=I420,width=512,height=512,framerate={}/1 ' \
                 '! videoconvert ! video/x-raw,format=I420 ' \
                 '! vp8enc' \
                 '! rtpvp8pay name=pay0'.format(self.fps)

	def on_need_data(self, src, length):
            print("need data!")
            self.queue.put(src)
            #self._last_t_v = t

	def do_create_element(self, url):
	    print("Create element!")
	    return Gst.parse_launch(self.launch_string)

	def do_configure(self, rtsp_media):
	    print("configure!")
	    self.number_frames = 0
	    appsrc = rtsp_media.get_element().get_child_by_name('source')
	    appsrc.connect('need-data', self.on_need_data)


	def gen(self, t):
	  if t - self._last_t_v >= 1.0/30:
	    """
	    if t - self._last_t_v >= 1.0/30:
		    data = np.zeros((240, 320, 3), dtype=np.uint8)
		    data = cv2.cvtColor(data, cv2.COLOR_RGB2YUV)

		    fontFace = cv2.FONT_HERSHEY_SIMPLEX
		    fontScale = 1
		    thickness = 1
		    color = (0, 255, 255)
		    text = "%6f" % t
		    oh = 0#v[0][1]*2
		    v = cv2.getTextSize(text, fontFace, fontScale, thickness)
		    cl = int(round(160 - v[0][0]/2))
		    cb = int(round(120 + oh - v[1] - v[0][1]/2))
		    cv2.putText(data, text, (cl, cb), fontFace, fontScale, color, thickness)

		    y = data[...,0]
		    u = data[...,1]
		    v = data[...,2]
		    u2 = cv2.resize(u, (0,0), fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
		    v2 = cv2.resize(v, (0,0), fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
		    data = y.tostring() + u2.tostring() + v2.tostring()
		    buf = Gst.Buffer.new_allocate(None, len(data), None)
		    assert buf is not None
		    buf.fill(0, data)
		    buf.pts = buf.dts = int(t * 1e9)
		    src_v.emit("push-buffer", buf)
		    self._last_t_v = t
	    """


class Gan(Thread):
    def __init__(self, queue):
        self.queue = queue
        self.last_push = -31337
        Thread.__init__(self)

    def run(self):
        self.number_frames = 0
        self.fps = 30
        self.duration = 1 / self.fps * Gst.SECOND
        self.load_snapshot()
        self.push_frames()

    def load_snapshot(self):
        # Load pre-trained network.
        tflib.init_tf()

        self.rnd = np.random.RandomState()
        #url = os.path.abspath("marrow/00021-sgan-dense512-8gpu/network-final.pkl")
        #url = os.path.abspath("marrow/00021-sgan-dense512-8gpu/network-snapshot-009247.pkl")
        #url = os.path.abspath("marrow/00021-sgan-dense512-8gpu/network-snapshot-008044.pkl")
        url = os.path.abspath("marrow/00021-sgan-dense512-8gpu/network-snapshot-010450.pkl")
        #url = os.path.abspath("marrow/00021-sgan-dense512-8gpu/network-snapshot-015263.pkl")
        #url = os.path.abspath("marrow/00021-sgan-dense512-8gpu/network-snapshot-011653.pkl")
        with open(url, 'rb') as f:
            self._G, self._D, self.Gs = pickle.load(f)
        print(self.Gs)
        self.latents = self.rnd.randn(1, self.Gs.input_shape[1])
        print(self.latents.shape)
        self.get_buf()

    def push_frames(self):
        while True:
            src = self.queue.get()
           # now = time.time()
           # print(now - self.last_push)
           # if now - self.last_push >= 1.0/15:
            print("Sending to {}", src)
            buf = self.get_buf()
            src.emit("push-buffer", buf)
            #self.last_push = now
            self.number_frames += 1

    def get_buf(self):
            # Generate image.
            fmt = dict(func=tflib.convert_images_to_uint8, nchw_to_nhwc=True)
            randcell = random.randint(0,511)
            #print(randcell)
            randchange = random.uniform(0, 1) 
            if randchange > 0.5:
                self.latents[0][randcell] = max(min(self.latents[0][randcell] + randchange,1),-1) 
            else:
                self.latents[0][randcell] = max(min(self.latents[0][randcell] - randchange,1),-1) 
            images = self.Gs.run(self.latents, None, truncation_psi=0.7, randomize_noise=True, output_transform=fmt)
            print("Got image!")
            data = cv2.cvtColor(images[0], cv2.COLOR_RGB2YUV)
            #print(data.shape)
            y = data[...,0]
            u = data[...,1]
            v = data[...,2]
            u2 = cv2.resize(u, (0,0), fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
            v2 = cv2.resize(v, (0,0), fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
            data = y.tostring() + u2.tostring() + v2.tostring()
            buf = Gst.Buffer.new_allocate(None, len(data), None)
            assert buf is not None
            buf.fill(0, data)
            timestamp = self.number_frames * self.duration
            buf.pts = buf.dts = int(timestamp)
            print(buf.pts)
            return buf


class GstServer(GstRtspServer.RTSPServer):
    def __init__(self, queue, **properties):
	    super(GstServer, self).__init__(**properties)
	    self.factory = SampleGenerator(queue)
	    self.factory.set_shared(True)
	    self.get_mount_points().add_factory("/marrow2", self.factory)
	    self.attach(None)

if __name__ == '__main__':

	#print("Generating samples")
	#for t in np.arange(0, 300, 0.000001):
	#	s.gen(t)
        GObject.threads_init()
        Gst.init(None)
        q = queue.Queue()
        gan = Gan(q)
        gan.start()
        server = GstServer(q)
        print(server)
        loop = GObject.MainLoop()
        loop.run()


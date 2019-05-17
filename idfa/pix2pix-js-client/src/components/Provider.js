import React, { Component } from 'react';
import io from 'socket.io-client';
import ReconnectingWebSocket from 'reconnectingwebsocket'

const AppContext = React.createContext()

// Server IP
const IP = 'http://ec2-3-211-0-139.compute-1.amazonaws.com:22100/infer';

class AppProvider extends Component {
  state = {
    debugMode: true,
    changeDebugMode: (s) => this.setState({debugMode: s}),
    cameras: [],
    setCameraDevices: (c) => this.setState({cameras: c}),
    HDConfigs: {
      video: {width: {min: 1080}, height: {min: 720}, deviceId: {}}
    },
    notHDConfigs: {
      video: {width: {exact: 640}, height: {exact: 480}, deviceId: {}}
    },
    cinemaModeSize: 150,
    setCinemaModeSize: (s) => this.setState({cinemaModeSize: s}),
    srcObject: null,
    currentConstrains: null,
    currentSceneIndex: 0,
    setCurrentSceneIndex: (s) => this.setState({ currentSceneIndex: s }),
    interval: null,
    startAutoplay: () => {
      if (this.state.interval){
        clearInterval(this.state.interval);
        clearInterval(this.state.faderInterval);
        this.setState({ interval: null,  faderInterval: null });
        document.getElementById('sceneElement').pause();
      } else {
        const loop = () => {
          setTimeout(() => this.setState({ faderOpacity: 1 }), (this.state.autoplaySceneDuration - 1.5) * 1000);
          // this.state.initScene(SCENES[this.state.currentSceneIndex].src);
          // this.state.setModel(SCENES[this.state.currentSceneIndex].name);
          // const currentSceneIndex = (this.state.currentSceneIndex + 1) % SCENES.length;
          // this.state.setCurrentSceneIndex(currentSceneIndex);
        }
        loop();
        const interval = setInterval(() => loop(), this.state.autoplaySceneDuration * 1000);
        this.setState({ interval })
     }
    },
    opacities: {
      scene: 1,
      camera: 0,
      transfer: 1,
    },
    faderOpacity: 0,
    initCamera: (constrains) => {
      const videoElement = document.getElementById('cameraElement');
      if (this.state.srcObject && this.state.srcObject.getTracks) {
        this.state.srcObject.getTracks().forEach(track => track.stop());
      }
      navigator.mediaDevices
        .getUserMedia(constrains)
        .then((stream) => {
          videoElement.srcObject = stream;
          this.setState({ srcObject: stream })
          this.setState({ currentConstrains: constrains })
        })
        .catch((error) => {
          console.log("Something went wrong with the camera!", error);
        });
    },
    cameraCanvasWidth: 200,
    cameraCanvasHeight: 100,
    setCameraCanvasWidth: (s) => this.setState({cameraCanvasWidth: s}),
    setCameraCanvasHeight: (s) => this.setState({cameraCanvasHeight: s}),
    isShowingCamera: true,
    setShowingCamera: (s) => this.setState({isShowingCamera: s}),
    isShowingCameraCanvas: false,
    setShowingCameraCanvas: (s) => this.setState({isShowingCameraCanvas: s}),
    pix2pixCanvasWidth: 1080,
    pix2pixCanvasHeight: 720,
    setPix2pixCanvasWidth: (s) => this.setState({pix2pixCanvasWidth: s}),
    setPix2pixCanvasHeight: (s) => this.setState({pix2pixCanvasHeight: s}),
    isShowingPix2pixCanvas: true,
    setShowingPix2pixCanvas: (s) => this.setState({isShowingPix2pixCanvas: s}),
    autoplayOn: false,
    autoplaySceneDuration: 10,
    autoplayCameraDuration: 3,
    serverIP: IP,
    marrowRoute: '/',
    marrowIP: "172.16.130.116",
    marrowPort: "9540",
    isConnectedToServer: false,
    isConnectedToMarrow: false,
    isSendingFrames: false,
    socket: null,
    marrowSocket: null,
    waitingForStart: false,
    showPix2Pix: false,
    setShowPix2Pix: (v) => this.setState({showPix2Pix: v}),
    setWaitingStatus: (v) => this.setState({waitingForStart: v}),
    setServerIP: (ip) => this.setState({serverIP: ip}),
    setMarrowIP: (ip) => this.setState({marrowIP: ip}),
    setMarrowPort: (port) => this.setState({marrowPort: port}),
    imageSliderOpacity: 1,
    setImageSliderOpacity: (v) => this.setState({imageSliderOpacity: v}),
    imagesWidth: 500,
    imagesHeight: 300,
    amountOfImages: 41,
    sliderSpeed: 2,
    isSliding: true,
    isExperienceRunning: false,
    centerImage: 99,
    isPosenetRunning: true,
    hide: false,
    isCentering: false,
    resetSlider: false,
    setResetSlider: (v) => this.setState({resetSlider: v}),
    setIsCentering: (v) => this.setState({isCentering: v}),
    setPosenetStatus: (v) => this.setState({isPosenetRunning: v}),
    setCenterImage: (v) => this.setState({centerImage: v}),
    setIsSliding: (v) => {
      if (this.state.isCentering) {
        this.setState({isCentering: false})
      }
      this.setState({isSliding: v})
    },
    setExperienceStatus: (v) => {
      if (v) {
        if(!this.state.isConnectedToServer) {
          this.state.connectToServer(this.state.serverIP);
        }

        setTimeout(() => {
          console.log('Start now!');
          this.state.setIsSliding(false)
          //this.state.sendMarrowStart();
          this.state.updateSendingFrameStatus(true)
        }, 7000);
        setTimeout(() => {
          //this.state.sendFrames();
          this.state.setShowPix2Pix(true);
        }, 37000);
        this.setState({
          hide: false,
          isExperienceRunning: true
        });
      } else {
        window.location.reload();
        this.state.setResetSlider(true);
        this.state.setIsSliding(true)
        this.state.setShowPix2Pix(false);
        this.state.updateSendingFrameStatus(false);
        this.setState({
          hide: false,
          isExperienceRunning: false
        });
      }
    },
    setSliderSpeed: (v) => this.setState({sliderSpeed: v}),
    setAmountOfImages: (v) => this.setState({amountOfImages: v}),
    setImagesWidth: (v) => this.setState({imagesWidth: v}),
    setImagesHeight: (v) => this.setState({imagesHeight: v}),
    connectToServer: (ip, port, route) => {
      this.setState({ ip: ip });
      this.setState({ isConnectedToServer: true });
      this.state.sendFrames();
    },
    connectToMarrow: (ip, port, route) => {
      if (!this.state.marrowSocket) {
        try {
            const marrowSocket = new ReconnectingWebSocket(`ws://${ip}:${port}${route}`);
            this.setState({ marrowSocket: marrowSocket });

            marrowSocket.onopen = () => {
              console.log('Connected to audio server');
              this.setState({ isConnectedToMarrow: true });
            };
            marrowSocket.onmessage = (packet) => {
                try {
                    let message = JSON.parse(packet.data);
                      if (message.action && message.action === "control") {
                        if (message.command && message.command === "start") {
                          this.state.setExperienceStatus(true);
                        } else if (message.command && message.command === "stop") {
                          this.state.setExperienceStatus(false);
                        } else if (message.command && message.command === "hide") {
                          console.log("Got hide command");
                           this.setState({
                            hide: true,
                            isExperienceRunning: false
                          });
                        }
                    }
                }
                catch(e) {
                    console.log("Error parsing Marrow message", e);
                }

            };
            marrowSocket.onclose =  () => {
              console.log('Disconnected from audio server')
              this.setState({ isConnectedToMarrow: false });
            };
        }
        catch (e) {
            console.log("Error connecting to Marrow websocket",e);
        }
      }
    },
    sendFakePix2Pix: () => {
        setInterval(() => {
            if (this.state.marrowSocket) {
                this.state.marrowSocket.send(JSON.stringify({action: "pix2pix"}));
            }
        },2000)
    },
    sendMarrowStart:() => {
        try {
          if (this.state.marrowSocket) {
            this.state.marrowSocket.send(JSON.stringify({action: "control", command: "start"}));
          }
        } catch(e) {
          console.log("Error sending marrow start",)
        }

    },
    updateSendingFrameStatus: (state) => {
      if (state) {
        this.setState({ isSendingFrames: true });
        this.state.sendFrames();
      } else {
        this.setState({ isSendingFrames: false });
      }
    },
    sendFrames: () => {
      if (this.state.isConnectedToServer) {
        console.log("Sending frames");
        const canvas = document.getElementById('cameraCanvas');
        this.setState({ isSendingFrames: true });
        console.log(canvas);
        fetch(this.state.serverIP, {
         method: 'POST',
         mode: 'cors',
         cache: 'no-cache',
         headers: {
             'Content-Type': 'application/json',
         },
         body : JSON.stringify({
             data: canvas.toDataURL('image/jpeg')
         })
     })
     .then((response) => {
         return response.json();
     })
     .then((data) => {
         const canvas = document.getElementById('pix2pixCanvas');
         const ctx = canvas.getContext('2d');
         const img = new Image();
         img.onload = () => {
           ctx.drawImage(img, 0, 0, this.state.pix2pixCanvasWidth, this.state.pix2pixCanvasHeight);
           if (this.state.isConnectedToMarrow) {
               this.state.marrowSocket.send(JSON.stringify({action: "pix2pix", loss: data.loss_function}));
           }
           if (this.state.isSendingFrames) {
             this.state.sendFrames();
           }
          };
          img.onerror = () => {
            if (this.state.isSendingFrames) {
              this.state.sendFrames();
            }
          }
          img.src = "data:image/jpg;base64," + data.results;
        });
     }
    }
  }

  render() {
    return (
    <AppContext.Provider value={this.state}>
      {this.props.children}
    </AppContext.Provider>)
  }
}

const withContext = (ReactComponent) => (
  props => (
    <AppContext.Consumer>
      {context => <ReactComponent {...props} context={context} />}
    </AppContext.Consumer>
  )
);

export {
  AppContext,
  AppProvider,
  withContext
};

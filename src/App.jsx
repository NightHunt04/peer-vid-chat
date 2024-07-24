import Peer from 'peerjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ShortUniqueId from 'short-unique-id'
import { io } from 'socket.io-client'
import { CopyToClipboard } from 'react-copy-to-clipboard'

function App() {
  const peer = useMemo(() => new Peer({ host: import.meta.env.VITE_APP_BACKEND_PEER_URL, port: import.meta.env.VITE_APP_BACKEND_PEER_PORT, path: '/', secure: true, config: { iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, ] } }), [])
  const socket = useMemo(() => io(import.meta.env.VITE_APP_BACKEND_SOCKET_URL), []) 
  const uid = new ShortUniqueId({ length: 5 })
  const [myId, setMyId] = useState(uid.rnd())
  const [remoteId, setRemoteId] = useState('') // the user input id 
  const [peerId, setPeerId] = useState('')
  const [remotedPeerId, setRemotedPeerId] = useState('')
  const [remoteUsername, setRemoteUsername] = useState('')
  const [remoteRoomId, setRemoteRoomId] = useState() // room id of other
  const [incomingRequest, setIncomingRequest] = useState(false)
  const [requestResponse, setRequestResponse] = useState(false)
  const [isUserVideo, setIsUserVideo] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [decline, setDecline] = useState(false)

  const [myStream, setMyStream] = useState()
  const [remoteStream, setRemoteStream] = useState()
  const myVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  // send connection request
  const handleSendRequest = useCallback(() => {
    setDecline(false)
    const username = `user-${myId}`
    socket.emit('request', { username, remoteId, id: peerId, roomId: myId })
  }, [remoteId, myId])

  // accept the request
  const handleAcceptRequest = useCallback(() => {
    setIncomingRequest(false)
    socket.emit('requestAccept', { remoteRoomId })

    const call = peer.call(remotedPeerId, myStream)
    call.on('stream', (remoteStream) => {
      setIsUserVideo(true)
      setRemoteStream(remoteStream)
    })
  }, [socket, remoteRoomId, peer, myStream, remoteVideoRef])


  // decline the request
  const handleDeclineRequest = useCallback(() => {
    setIncomingRequest(false)

    if(remoteId)
      socket.emit('requestDecline', { to: remoteId })

    else if(remoteRoomId)
      socket.emit('requestDecline', { to: remoteRoomId })
  }, [remoteId, remoteRoomId])

  // make a peer
  useEffect(() => {
    console.log('setting peer')
    peer.on('open', id => {
      console.log('peer : done')
      setPeerId(id)
    })
  }, [peer])

  const handleCall = useCallback((call) => {
    console.log('someone is calling')
      call.answer(myStream)
      call.on('stream', (remoteStream) => {
        setIsUserVideo(true)
        setRemoteStream(remoteStream)
      })
  }, [remoteVideoRef, myStream])

  useEffect(() => {
    if(remoteStream && remoteVideoRef.current)
      remoteVideoRef.current.srcObject = remoteStream
  }, [remoteStream])

  // handling incoming call
  useEffect(() => {
    peer.on('call', handleCall)
    return () => {
      peer.off('call', handleCall)
    }
  }, [peer, handleCall])

  // join a room in their own rooms
  useEffect(() => {
      socket.emit('joinId', { id: myId })
      console.log('setting socket')
      console.log('socket : done')
  }, [socket, myId])

  // start the video
  useEffect(() => {
    const startStream = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setMyStream(stream)
      myVideoRef.current.srcObject = stream
    }

    startStream()
  }, [])

  
  // socket handlers
  const handleIncomingRequest = useCallback(({ username, id, roomId }) => {
    setIncomingRequest(true)
    setRemoteUsername(username)
    setRemotedPeerId(id)
    setRemoteRoomId(roomId)
    console.log('peer', id)
  }, [remoteUsername, remotedPeerId, remoteRoomId])

  const handleRequestResponse = useCallback(() => {
    setRequestResponse(true)
  }, [])

  const handleRequestAccepted = useCallback((val) => {
    setRequestResponse(false)
  }, [])

  const handleRequestDecline = useCallback((val) => {
    setDecline(true)
    setRequestResponse(false)
  })

  useEffect(() => {
    socket.on('request', handleIncomingRequest)
    socket.on('requestResponse', handleRequestResponse)
    socket.on('requestAccept', handleRequestAccepted)
    socket.on('requestDecline', handleRequestDecline)

    return () => {
      socket.off('request', handleIncomingRequest)
      socket.off('requestResponse', handleRequestResponse)
      socket.off('requestAccept', handleRequestAccepted)
    }
  }, [socket, handleIncomingRequest, handleRequestResponse, handleRequestAccepted])

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center text-sm md:text-md bg-zinc-950 text-white font-poppins">
      <div className="flex flex-col items-center justify-center pt-5 md:pt-0">
        <h1 className="text-xl md:text-4xl">Video<span className="font-bold">Chat</span></h1>
        <p className="text-[#ddd] text-center w-[80%] md:w-full text-xs md:text-sm">Connect, talk, and brain rot by not keeping silence. ~jeet</p>
      </div>

      <div className="w-[85%] md:w-[70%] flex flex-col items-center justify-center mt-10 mb-5">
        <div className="w-full flex flex-col md:flex-row items-center justify-center gap-4 rounded-lg p-4 border-[1px] border-slate-800">
          <div className="w-full flex items-center justify-center bg-zinc-900 h-[200px] md:h-[450px] rounded-lg">
            <video ref={myVideoRef} muted autoPlay playsInline className='w-full h-full object-cover rounded-lg'></video>
          </div>

          <div className="w-full flex items-center justify-center bg-zinc-900 h-[200px] md:h-[450px] rounded-lg">
          {isUserVideo && remoteStream ? 
            <video ref={remoteVideoRef} autoPlay playsInline className='w-full h-full object-cover rounded-lg'></video>
            :
            <div className="flex flex-col items-center justify-center">
              <i className="fa fa-user-circle text-slate-700 text-5xl md:text-6xl object-cover" aria-hidden="true"></i>
              <p className="mt-3 text-[#ddd]">No user connected yet</p>
            </div>
          }
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 items-center md:items-start justify-between w-full mt-5">
          <div className="order-2 md:order-1 px-5 py-4 self-start flex flex-col items-start justify-start rounded-lg border-[1px] border-slate-800">
            <div className='px-1 flex flex-col items-start justify-start'>
              <div>
                <p className='text-xs text-[#ddd]'>Share your ID to someone to connect</p>
              </div>

              <div className='flex items-center justify-center gap-3 mt-1'>
              <div className='px-3 py-2 rounded-lg border-[1px] border-slate-800 flex items-center justify-center gap-2'>
                <p>Your ID :&nbsp;</p>
                <p className='px-3 py-1 bg-slate-800 rounded-md border-[1px] border-green-700'>{myId}</p>
              </div>
              <CopyToClipboard text={myId} onCopy={() => {
                setIsCopied(true)

                setTimeout(() => setIsCopied(false), 3000)
              }}>
                <button className='px-3 py-3 hover:border-green-700 transition-all duration-200 outline-none border-[1px] border-slate-700 rounded-lg'>Copy</button>
              </CopyToClipboard>

              {isCopied && 
              <div className='flex items-center justify-center gap-1 md:ml-5'>
                <img src="/assets/circle.png" className='w-[15px] h-[15px] object-cover' />
                <p className='py-2 rounded-lg text-[10px] md:text-xs'>Copied</p>
              </div>}
              </div>
            </div>

            <div className="px-1 flex flex-col items-start justify-start mt-4">
              <p className="font-medium text-md">Input panel</p>
              <p className="text-xs text-[#ddd]">Enter the ID of other to connect to them</p>
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <input 
                type="text"
                value={remoteId}
                disabled={incomingRequest}
                onChange={e => setRemoteId(e.target.value)}
                placeholder="Write ID here" 
                className="bg-transparent w-full rounded-lg px-3 py-2 outline-none text-sm text-[#ddd] border-[1px] border-gray-800"/>
              <button disabled={incomingRequest} onClick={handleSendRequest} className="px-3 py-2 rounded-lg outline-none bg-slate-800 shadow-md border-[1px] border-slate-700 hover:border-blue-600 hover:opacity-80 transition-all duration-200">Request</button>
            </div>
          </div>

          {/* calling component */}
          {incomingRequest &&
            <div className="order-1 w-full md:w-[40%] md:order-2 px-10 py-4 flex flex-col items-start justify-start rounded-lg border-[1px] animate-anim_border_key">
              <p>Incoming call from <span className="font-semibold">{remoteUsername}</span></p>
              <div className="flex items-center justify-between w-full gap-2 mt-4">
                <button onClick={handleAcceptRequest} className="rounded-lg text-sm border-[1px] w-full hover:opacity-80 border-green-700 px-4 py-2 bg-[#042b02]">Accept</button>
                <button onClick={handleDeclineRequest} className="rounded-lg text-sm border-[1px] w-full hover:opacity-80 border-red-700 px-4 py-2 bg-[#2b0202]">Decline</button>
              </div>
            </div>}
          
          {requestResponse &&
            <div className="text-xs md:text-sm order-1 w-full md:w-[40%] md:order-2 p-3 md:px-10 md:py-4 flex flex-col items-start justify-start rounded-lg border-[1px] animate-anim_border_key_res">
              <p className='w-full'>Request sent successfully, waiting for the approval to make the connection.</p>
            </div>}

          {decline &&
          <div className="text-xs md:text-sm order-1 w-full md:w-[40%] md:order-2 p-3 md:px-10 md:py-4 flex flex-col items-start justify-start rounded-lg border-[1px] border-red-800">
            <p className='w-full text-center md:text-left'>Your request was declined, so sad :( try again</p>
          </div>}

          {isUserVideo &&
            <div className='order-1 w-full md:w-[20%] md:order-2'>
              <button onClick={() => window.location.reload()} className='px-3 py-2 md:px-6 md:py-3 outline-none border-[1px] hover:border-red-600 opacity-90 transition-all duration-200 bg-[#2b0202b1] border-red-800 rounded-lg w-full'>End Call</button>
            </div>}
        </div>

      </div>
    </div>
  )
}

export default App

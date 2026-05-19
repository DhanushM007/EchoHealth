import { useState,useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App(){
  
  const [message,setMessage]=useState("");
  useEffect(()=>{
    fetch('http://127.0.0.1:5000/chat',{
      method:"POST",
      headers:{
        "Content-type":"application/json"
      },
      body:JSON.stringify({
        "conversation": [
          {
            "role": "user",
            "content": "I have fever"
          }
        ]
      })
    })
    .then(res=>res.json())
    .then(data=>setMessage(data.reply))
    .catch(err=>console.log(err))
  },[]);

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">{message}</h1>
    </div>
  );
}
export default App;
"use client"

import { useState } from "react"
import { Montserrat } from "next/font/google"
import Sidebar from "@/components/shared/StudentSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  maroon: "#7B1113",
  pageBg: "#F0EFE8",
  cardShadow: "0 3px 10px rgba(0,0,0,0.15)",
  qrBg: "#C8D6D0",
}

export default function QRGenerationPage() {
  const [generated, setGenerated] = useState(false)
  const [time, setTime] = useState("")
  const [location, setLocation] = useState("")

  const handleGenerateQR = () => {
    setGenerated(true)

    setTime(
      new Date().toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    )

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(
            `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`
          )
        },
        () => {
          setLocation("Location unavailable")
        }
      )
    } else {
      setLocation("Location unavailable")
    }
  }

  return (
    <>
      <style>{`
        .qr-page {
          min-height: 100vh;
          display: flex;
          background: ${C.pageBg};
          font-family: 'Montserrat', sans-serif;
        }

        .qr-main {
          flex: 1;
          margin-left: 120px;
          padding: 28px 32px;
          min-width: 0;
        }

        .qr-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .qr-title {
          font-size: 42px;
          font-weight: 800;
          color: ${C.maroon};
          margin: 0;
          letter-spacing: -1px;
        }

        .qr-box {
          background: ${C.qrBg};
          height: 630px;
          border-radius: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
        }

        .qr-card {
          width: 380px;
          min-height: 500px;
          background: white;
          border-radius: 30px;
          box-shadow: ${C.cardShadow};
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
        }

        .qr-code {
          width: 220px;
          height: 220px;
          border-radius: 8px;
          background:
          repeating-linear-gradient(
            45deg,
            #000 0,
            #000 5px,
            #fff 5px,
            #fff 10px
          );
        }


        @media(max-width: 900px){

          .qr-main {
            margin-left: 100px;
            padding: 24px 20px;
          }

          .qr-title {
            font-size: 34px;
          }

          .qr-box {
            height: auto;
            min-height: 550px;
          }

        }


        @media(max-width: 600px){

          .qr-main {
            margin-left: 80px;
            padding: 20px 12px;
          }


          .qr-header {
            gap: 10px;
          }


          .qr-title {
            font-size: 24px;
            letter-spacing: -0.5px;
          }


          .qr-box {
            min-height: 480px;
            padding: 14px;
            border-radius: 16px;
          }


          .qr-card {
            width: 100%;
            min-height: 360px;
            padding: 20px;
            border-radius: 22px;
          }


          .qr-code {
            width: 160px;
            height: 160px;
          }

        }


        @media(max-width: 420px){

          .qr-main {
            margin-left: 70px;
            padding: 16px 10px;
          }


          .qr-title {
            font-size: 20px;
          }


          .qr-card {
            padding: 15px;
          }

        }

      `}</style>


      <div className={`${montserrat.variable} qr-page`}>

        <Sidebar />


        <main className="qr-main">


          <div className="qr-header">

            <h1 className="qr-title">
              QR GENERATION
            </h1>


            <ProfilePill
              name="Kim, Mingyu"
              initials="MK"
              section="H"
            />

          </div>


          <div
            style={{
              height: 2,
              background:"#D9DDD8",
              marginTop:40,
              marginBottom:24
            }}
          />


          <div className="qr-box">


            <div className="qr-card">


              {!generated ? (

                <button
                  onClick={handleGenerateQR}
                  style={{
                    background:"#7FA58F",
                    border:"none",
                    borderRadius:40,
                    padding:"18px 38px",
                    fontSize:22,
                    fontWeight:800,
                    cursor:"pointer",
                  }}
                >
                  GENERATE QR
                </button>


              ) : (

                <div
                  style={{
                    display:"flex",
                    flexDirection:"column",
                    alignItems:"center",
                    gap:16,
                    textAlign:"center",
                  }}
                >

                  <div className="qr-code"/>


                  <div>
                    <p style={{fontSize:14,fontWeight:600}}>
                      Location of Generation:
                      <br/>
                      {location || "Fetching location..."}
                    </p>

                    <p style={{fontSize:14,fontWeight:600}}>
                      Time of Generation:
                      <br/>
                      {time}
                    </p>
                  </div>


                  <button
                    onClick={handleGenerateQR}
                    style={{
                      background:"#7FA58F",
                      border:"none",
                      borderRadius:40,
                      padding:"14px 28px",
                      fontSize:16,
                      fontWeight:800,
                      cursor:"pointer",
                    }}
                  >
                    REGENERATE QR
                  </button>


                </div>

              )}

            </div>


          </div>


        </main>

      </div>

    </>
  )
}
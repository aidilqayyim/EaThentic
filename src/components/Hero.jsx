import React from 'react'

const Hero = () => {
  return (
    <div className='bg-[#fef1e1] w-full h-screen flex flex-col justify-center items-center text-black px-5'>
        <div className='text-5xl font-bold'>Identify Fake Reviews on Website</div>
        <div className='text-2xl font-normal mt-5'>Enter the restaurant location to get started!</div>
        <input className='w-72 rounded-md mt-5 p-2 focus:outline-none focus:ring-2 focus:ring-white' placeholder='Location'></input>
    </div>
  )
}

export default Hero
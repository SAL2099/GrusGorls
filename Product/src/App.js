import React from 'react';

import Header from './components/Header';
import BottomNav from './components/BottomNav'

//Npm install react-scripts
//First navigate to GrusGorls folder in terminal using cd then navigate to Product folder using cd Product
//To run server use npm start in terminal
//To see what it looks like in app form, right click inspect and click on the app tab
// ctrl + c to stop server



export default function App() {
  return (
    <>
    <Header />
    {/* :) */}
    <BottomNav />
    </>
  );
}

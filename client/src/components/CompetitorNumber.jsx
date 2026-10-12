import React from 'react';
import {OutlineIcon} from './OutlineIcon.jsx';
import '../styles/competitor-number.css';
export const formatCompetitorNumber=number=>String(number).padStart(4,'0');
export default function CompetitorNumber({number,compact=false,label='Número de competidor'}){
 if(!number)return null;
 return <div className={'competitor-number'+(compact?' competitor-number-compact':'')}><span><OutlineIcon name="user"/>{label}</span><strong>{formatCompetitorNumber(number)}</strong></div>;
}

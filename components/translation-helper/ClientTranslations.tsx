//@ts-nocheck
'use client'

import { useState, useEffect } from "react";
import GlobalConfig from '@/app/app.config.js'

export function GetTranslation({text}) {    
    var TranslationData = require(`@/translation/${GlobalConfig.LANG}.json`);
    return TranslationData[text]
}
'use client'

import * as React from 'react'

import { Button, type ButtonProps } from '@/components/ui/button'
import Link from 'next/link'
import GlobalConfig from '@/app/app.config.js'
import ArrowForwardIosOutlinedIcon from '@mui/icons-material/ArrowForwardIosOutlined';

export default function OutlineInstanceButton() {
    var TranslationData = require(`@/translation/${GlobalConfig.LANG}.json`);
    return(
        <div>
        <Button asChild>
        <Link href={process.env.NEXT_PUBLIC_OUTLINE_ADDRESS!} rel="noopener noreferrer" target="_blank">{TranslationData["Open Your Outline Instance"]} <ArrowForwardIosOutlinedIcon/></Link>
        </Button>
        </div>
    )
}
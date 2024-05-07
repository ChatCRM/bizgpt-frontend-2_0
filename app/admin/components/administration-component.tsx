'use client'
import React from 'react'
import { GetTranslation } from "@/components/translation-helper/ClientTranslations"
import { Separator } from "@/components/ui/separator"
const TextDirection = process.env.TEXT_DIRECTION

export function AdministrationComponent() {
    return (
        <>
        <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight" dir={TextDirection}>
                <GetTranslation text="Administration" />
            </h2>
            <p className="text-muted-foreground" dir={TextDirection}>
                <GetTranslation text="Manage your system" />
            </p>
        </div>
        <Separator/>
        </>
    )
}

"use client"
 
import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
 
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import GlobalConfig from '@/app/app.config.js'
import { useRouter } from 'next/navigation'

const languages = process.env.NEXT_PUBLIC_TEXT_DIRECTION == 'RTL' ? [
  {
    value: "fa",
    label: "فارسی",
  }
] : 
[
  {
    value: "en",
    label: "English",
  },
  {
    value: "fr",
    label: "French",
  }
]

const LANG_SETTING = GlobalConfig.LANG

export function LangDropDown() {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState(LANG_SETTING?.toLocaleLowerCase())
    value ? (GlobalConfig.LANG  = value.toUpperCase()) : undefined
    const router = useRouter()
    var TranslationData = require(`@/translation/${GlobalConfig.LANG}.json`);

    return (
        <div className="flex items-center space-x-4">
        {/* <p className="text-sm text-muted-foreground">{TranslationData["Language"]}</p> */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[100px] justify-between"
          >
            {value
              ? languages.find((language) => language.value === value)?.label
              : TranslationData["Select language..."]}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[100px] p-0">
          <Command>
            <CommandEmpty>{TranslationData["No language found."]}</CommandEmpty>
            <CommandGroup>
              {languages.map((language) => (
                <CommandItem
                  key={language.value}
                  value={language.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue)
                    setOpen(false)
                    currentValue != value ? (router.refresh()) : undefined
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === language.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {language.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      </div>
    )
  }
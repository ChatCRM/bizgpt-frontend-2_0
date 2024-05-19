// @ts-nocheck 
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Label } from "@/components/ui/label"
import { useState, useEffect } from 'react'
import validator from "validator";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

import GlobalConfig from '@/app/app.config.js'

const TextDirection = process.env.TEXT_DIRECTION

const validateEmail = (e) => {
  const email = e.target.value;

  if (validator.isEmail(email)) {
    return true
  } else {
    false
  }
};

export function AddUser({ mutate }) {
  const { toast } = useToast()
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isValidEmail, setIsValidEmail] = useState(true)
  const [isReady, setIsReady] = useState(true)
  const [role, setRole] = React.useState("editor")

  const [open, setOpen] = React.useState(false);

  // Language and Translation
  var TranslationData = require(`@/translation/${GlobalConfig.LANG}.json`);

  function onSubmit_User(data) {
    setIsReady(false)
    data.preventDefault();
    fetch('/api/admin/access-control/add-user', { method: 'POST', body: JSON.stringify({ email: email, password: password, role: role }) }).then(data => {
      if ( data.status == 200){
        toast({ title:  TranslationData["Successfully added The new user."]  });
        mutate();
      // resetting all the states
      setEmail('')
      setPassword('')
      setPasswordConfirm('')
      setIsValidEmail(true)
      setIsReady(true)
      setOpen(false)
      }
      else {
        toast({ title:  TranslationData["Could not add new user."]  });
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{TranslationData["Add New User"]}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader dir={TextDirection}>
          <DialogTitle> {TranslationData["Add User"]}</DialogTitle>
          <DialogDescription>
          {TranslationData["Add a new user and provide their info"]}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit_User}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4" dir={TextDirection}>
              <Label htmlFor="email" className="text-right">
              {TranslationData["Email"]}
              </Label>
              <Input id="email" type="text" dir="LTR" value={email} required onChange={(e) => { setEmail(e.target.value); if (validateEmail(e)) { setIsValidEmail(true); } else setIsValidEmail(false); }} className="col-span-3" />
              {isValidEmail ? undefined : <p  className={TextDirection == 'RTL' ? "col-span-4 text-sm pr-24 text-red-500" : "col-span-4 text-sm pl-24 text-red-500" }> {TranslationData["please provide a correct email"]}  </p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4" dir={TextDirection}>
              <Label htmlFor="password" className="text-right">
              {TranslationData["Password"]}
              </Label>
              <Input id="password" dir="LTR" type="password" required value={password} onChange={(e) => { setPassword(e.target.value); }} className="col-span-3" />
              {(password == passwordConfirm) ? undefined : <p className={TextDirection == 'RTL' ? "col-span-4 text-sm pr-24 text-red-500" : "col-span-4 text-sm pl-24 text-red-500" }> {TranslationData["please confirm the password"]} <ArrowDownwardIcon /> </p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4" dir={TextDirection}>
              <Label htmlFor="password_confirm" className="text-right">
              {TranslationData["Confirm Password"]}
              </Label>
              <Input id="password_confirm" dir="LTR" type="password" value={passwordConfirm} required onChange={(e) => { setPasswordConfirm(e.target.value); }} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4" dir={TextDirection}>
              <Label htmlFor="password_confirm" className="text-right">
                {TranslationData["Role"]}
              </Label>
              <DropdownMenu className="col-span-3" >
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">{role.charAt(0).toUpperCase() + role.slice(1)}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>{TranslationData["Roles"]}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={role} onValueChange={setRole}>
                    <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="editor">Editor</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="viewer">Viewer</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              {TextDirection == 'RTL' ? (isValidEmail & (password.length > 0) & (password == passwordConfirm) ? (<Button type="submit" disabled={!isReady}  
              > {TranslationData["Save"]} </Button>) : <Button disabled={true}> {TranslationData["Save"]} </Button>) :  isValidEmail & (password.length > 0) & (password == passwordConfirm) ? (<Button type="submit" disabled={!isReady}  
              > {TranslationData["Save"]} </Button>) : (<Button disabled={true}> {TranslationData["Save"]} </Button>)
              }
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
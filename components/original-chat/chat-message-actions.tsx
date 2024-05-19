// @ts-nocheck 
'use client'

import { type Message } from 'ai'

import { Button } from '@/components/ui/button';
import ButtonMaterial from '@mui/material/Button';
import { IconCheck, IconCopy } from '@/components/ui/icons'
import { useCopyToClipboard } from '@/lib/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/utils'

import { useState, useEffect } from "react";
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import axios from 'axios'

import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';

import Stack from '@mui/material/Stack';
import { Box } from "@mui/material";
import { styled } from '@mui/material/styles';
import TextField from "@mui/material/TextField";
import SendIcon from '@mui/icons-material/Send';

import { StyledEngineProvider } from '@mui/material/styles';
import { submitFeedback, submitBookmark } from '@/components/original-chat/actions'
import GlobalConfig from '@/app/app.config.js'

const StyledTextField = styled(TextField)(
  ({ color }) => `
      width: 60vw;
      font-family: sans-serif;
      font-size: 0.875rem;
      font-weight: 400;
      padding: 0px 12px;
      border-radius: 8px;
      color: ${color};
      border: 1px solid ${color};
      background: transparent;
      `
);

const colors = {
  grey: "#000000",
  "😀": "#4caf50",
  "🙂": "#6fbf73",
  "😐": "#ff9800",
  "🙁": "#f6685e",
  "😞": "#f44336"
}

const TextFieldcolors = {
  "😀": "success",
  "🙂": "success",
  "😐": "warning",
  "🙁": "error",
  "😞": "error"
}

const FaceToScoreMapping = {
  "😀": 100,
  "🙂": 80,
  "😐": 60,
  "🙁": 40,
  "😞": 20
}

const FaceToScoreMappingReverse = {
  100: "😀",
  80: "🙂",
  60: "😐",
  40: "🙁",
  20: "😞"
}

function index_fixer(number: Number): Number {
  if (number <= 1) {
    return 1
  }
  else {
    return Math.round(number / 2)
  }
}

interface ChatMessageActionsBookmarkProps extends React.ComponentProps<'div'> {
  message: Message,
  index: number,
  username: String | undefined,
  bookmakrs: JSON | undefined
  chat_id: String | undefined
  user_id: String | undefined
}

interface ChatMessageActionsFeedbackProps extends React.ComponentProps<'div'> {
  message: Message,
  index: number,
  username: String | undefined,
  feedbacks: JSON | undefined
  chat_id: String | undefined
  user_id: String | undefined
}


export function ChatMessageActionsBookmark({
  chat_id,
  user_id,
  message,
  index,
  username,
  bookmarks,
  className,
  ...props
}: ChatMessageActionsBookmarkProps) {
  const [isBookmarked, setBookmark] = useState(false);

  const bookmark_state = bookmarks?.bookmarks[`bookmark_${index_fixer(index)}`]?.bookmark
  useEffect(() => {
    if (index % 2 != 0) {
      if (bookmark_state) {
        setBookmark(bookmark_state);
      }
    }
  }, [bookmark_state, index])

  const Bookmark = async () => {
    if (isBookmarked == true) {
      setBookmark(false)

      const bookmark_key = `bookmark_${index_fixer(index)}`
      let payload = { data: { ...bookmarks?.bookmarks }, mode: process.env.PERSISTENCE_MODE, state_diff: {} }
      payload['data'][bookmark_key] = { "bookmark": false }
      payload['chat_id'] = chat_id
      payload['user_id'] = user_id
      payload['username'] = username
      payload['state_diff']['bookmark_state'] = false
      payload['state_diff']['index'] = index_fixer(index)
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {},
        body: JSON.stringify(payload)
      }
      )
      submitBookmark(payload)
    }
    else if (isBookmarked == false) {
      setBookmark(true)
      const bookmark_key = `bookmark_${index_fixer(index)}`
      let payload = { data: { ...bookmarks?.bookmarks }, mode: process.env.PERSISTENCE_MODE, state_diff: {} }
      payload['chat_id'] = chat_id
      payload['user_id'] = user_id
      payload['username'] = username
      payload['data'][bookmark_key] = { "bookmark": true }
      payload['state_diff']['bookmark_state'] = true
      payload['state_diff']['index'] = index_fixer(index)
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {},
        body: JSON.stringify(payload)
      }
      )
      submitBookmark(payload)
    }
  }


  if (index % 2 != 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-end md:absolute md:-right-10 md:-top-1 ',
          className
        )}
        {...props}
      >
        <Button variant="ghost" size="icon" onClick={Bookmark}>
          {isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
        </Button>

      </div>
    )
  }
}



export function ChatMessageActionsFeedback({
  chat_id,
  message,
  index,
  username,
  user_id,
  feedbacks,
  className,
  ...props
}: ChatMessageActionsFeedbackProps) {
  const [submitted, setSubmitted] = useState(false);
  const [inputText, setInputText] = useState(null);
  const [faceScore, setFaceScore] = useState(null);
  const TextDirection = process.env.NEXT_PUBLIC_TEXT_DIRECTION
  const feedback_state = feedbacks?.feedbacks[`feedback_${index_fixer(index)}`]?.score

  // Language and Translation
  var TranslationData = require(`@/translation/${GlobalConfig.LANG}.json`);

  useEffect(() => {
    if (index % 2 != 0) {
      if (feedback_state) {
        setSubmitted(true);
        setFaceScore(feedback_state);
      }
    }
  }, [feedback_state, index])

  const handleFaceClick = (score: String) => {
    if (score === faceScore) {
      setFaceScore(null);
    } else {
      setFaceScore(score);
    }
  };

  const selectColor = (score: string) => {
    if (faceScore) {
      if (score === faceScore) {
        return colors[score]
      } else {
        if (submitted) {
          return "transparent"
        } else {
          return colors["grey"]
        }
      }
    } else {
      return colors["grey"]
    }
  }

  const selectHoverColor = (score: string) => {
    if (faceScore) {
      if (score === faceScore) {
        return colors[score]
      } else {
        if (submitted) {
          return "transparent"
        } else {
          return colors[score]
        }
      }
    } else {
      return colors[score]
    }
  }

  const handleTextInput = (text) => {
    setInputText(text.currentTarget.value);
  };

  const handleSubmission = () => {
    setSubmitted(true);

    const feedback_key = `feedback_${index_fixer(index)}`
    let payload = { data: { ...feedbacks?.feedbacks }, mode: process.env.PERSISTENCE_MODE, state_diff: {} }
    payload[feedback_key] = { "type": "faces", "score": FaceToScoreMapping[faceScore], "text": inputText }
    payload['chat_id'] = chat_id
    payload['user_id'] = user_id
    payload['username'] = username
    payload['data'][feedback_key] = { "type": "faces", "score": FaceToScoreMapping[faceScore], "text": inputText }
    payload['state_diff']['score'] = FaceToScoreMapping[faceScore]
    payload['state_diff']['text'] = inputText
    payload['state_diff']['index'] = index_fixer(index)
    payload['response'] = message.content
    fetch('/api/feedbacks', {
      method: 'POST',
      headers: {},
      body: JSON.stringify(payload)
    }
    )
    submitFeedback(payload)
  };
  if (index % 2 != 0) {
    return (
      <Box className="remove-all" paddingY={0.5} height={140} component="form" sx={{ "& .MuiTextField-root": { m: 1, width: "50ch" } }} noValidate autoComplete="off">
        <Stack className="feedback-cls" direction="row" spacing={0} justifyContent={'right'} alignItems={'right'}>
          <SentimentVeryDissatisfiedIcon
            sx={{
              fontSize: 24,
              color: selectColor("😞"),
              '&:hover': {
                cursor: submitted ? null : "pointer",
                color: selectHoverColor("😞"),
              },
            }}
            onClick={() => submitted ? {} : handleFaceClick("😞")}
          />
          <SentimentDissatisfiedIcon
            sx={{
              fontSize: 24,
              color: selectColor("🙁"),
              '&:hover': {
                cursor: submitted ? null : "pointer",
                color: selectHoverColor("🙁"),
              },
            }}
            onClick={() => submitted ? {} : handleFaceClick("🙁")}
          />
          <SentimentNeutralIcon
            sx={{
              fontSize: 24,
              color: selectColor("😐"),
              '&:hover': {
                cursor: submitted ? null : "pointer",
                color: selectHoverColor("😐"),
              },
            }}
            onClick={() => submitted ? {} : handleFaceClick("😐")}
          />
          <SentimentSatisfiedIcon
            sx={{
              fontSize: 24,
              color: selectColor("🙂"),
              '&:hover': {
                cursor: submitted ? null : "pointer",
                color: selectHoverColor("🙂"),
              },
            }}
            onClick={() => submitted ? {} : handleFaceClick("🙂")}
          />
          <SentimentSatisfiedAltIcon
            sx={{
              fontSize: 24,
              color: selectColor("😀"),
              '&:hover': {
                cursor: submitted ? null : "pointer",
                color: selectHoverColor("😀"),
              },
            }}
            onClick={() => submitted ? {} : handleFaceClick("😀")}
          />
          {submitted === false && faceScore !== null ? <StyledTextField id="outlined-multiline-static" inputProps={{ maxLength: "1000" }} onChange={handleTextInput} multiline rows={4} dir={TextDirection} placeholder={TranslationData["Please describe..."]} aria-label="Demo input" color={TextFieldcolors[faceScore]} /> : null}
          {submitted === false && faceScore !== null ? <ButtonMaterial sx={{ color: colors[faceScore] }} endIcon={<SendIcon />} variant="text" size="small" onClick={handleSubmission}>{TranslationData["Submit"]}</ButtonMaterial> : null}
        </Stack>
      </Box>
    )
  }
}
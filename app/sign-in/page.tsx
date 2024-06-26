import { auth, authUser } from '@/auth'
import { LoginButton } from '@/components/login-button'
import { LoginForm } from '@/components/login-form'
import { LoginFormSearchParams } from '@/components/login-form-searchparams'
import { Separator } from '@/components/ui/separator'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'


export default async function SignInPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {

  let session = await authUser()

  // legacy code
  // // //  const user_id = searchParams?.user_id

  const token = searchParams?.token
  const BIZGPT_IFRAME_MODE = process.env.BIZGPT_IFRAME_MODE

  // redirect to home if user is already logged in
  if (session?.user) {
    redirect('/')
  }

  if (BIZGPT_IFRAME_MODE == 'true' && token) {
    // if query_params is passed

    if (process.env.DEBUG_MODE) console.log("DEBUG MODE - IFRAME ===> TOKEN: ", token)
    const url = `${process.env.IFRAME_AUTH_API_BASE_URL}/${process.env.IFRAME_AUTH_API_PATH_URL}`
    const requestHeaders: HeadersInit = new Headers();
    requestHeaders.set("Authorization", `Bearer ${token}`);
    requestHeaders.append("Cookie", "ASP.NET_SessionId=rdes0ve3eh4hbw4e0jbmrga0");
    const iframe_auth_response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
    });
    const iframe_auth_response_json = await iframe_auth_response.json()
    if (process.env.DEBUG_MODE) console.log("DEBUG MODE - IFRAME ===> RESPONSE: ", iframe_auth_response_json)
    const user_id = iframe_auth_response_json.Success == true ? iframe_auth_response_json?.Family[0]?.DetailsID : undefined
    return (
      user_id ? <LoginFormSearchParams user_id={user_id} /> : (
        <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-rose-500 text-center"> * Invalid Token * </h1>
            <LoginForm action="sign-in" />
          </div>
        </div>)
    )

  }


  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-10">
      <div className="w-full max-w-sm">
        <LoginForm action="sign-in" />
        {/* <div className="flex flex-row justify-center">
          <LoginButton />
        </div> */}
      </div>
    </div>
  )
}

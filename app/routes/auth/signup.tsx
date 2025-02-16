import * as v from 'valibot'
import {useState, type SyntheticEvent} from 'react'
import {createFileRoute, useNavigate, useRouter} from '@tanstack/react-router'
import {signUp} from '~/lib/auth-client'
import { FormFieldError } from '~/components/FormFieldError';
import {createServerFn} from "@tanstack/start";

// TypeScript - what is the purpose of this?
// It doesn't help type the useState type issues below, etc
type SignupData = {
  email: string;
  password: string;
  name: string;
};

// Valibot
const SignupSchema = v.object({
  email: v.pipe(
    v.string('email must be a string'),
    v.nonEmpty('email address required'),
    v.email('invalid email'),
  ),
  // image: v.string(),
  password: v.pipe(v.string(), v.nonEmpty('password required')),
  name: v.string(),
});

// export const sendEmail = createServerFn({method: 'POST'})
//   .validator((d: any) => d)
//   .handler(async ({data}) => {
//     console.log('sending testMessage', {/*mailSender, */data})
//     // mailSender.sendMail(data, function (error: any, info: any) {
//     //   if (error) {
//     //     console.log(error);
//     //   } else {
//     //     // console.log("mailSender.sendEmail - sent message", {info});
//     //   }
//     // });
//   })

const sendEmail = createServerFn({method: 'POST'})
  .validator((d: number) => d)
  .handler(async ({data}) => {
     console.log('sending testMessage', {data})
  })


const thisPath = '/auth/signup'
export const Route = createFileRoute(thisPath)({
  component: SignUp,
})

export default function SignUp() {
  const router = useRouter()
  // let testMailResult: Promise<void>
  // const [didVerifyMailSender, setDidVerifyMailSender] = useState(false)
  // if (!didVerifyMailSender) {
  //   setDidVerifyMailSender(true)
  //   testMailResult = testMail({data: 'a@stzdev.com'}).then(() => {
  //     // console.log ('testMailResult', testMailResult)
  //     // router.invalidate()
  //   })
  // }

  // sendEmail({data: 'a@stzdev.com'}).then(() => {
  //   router.invalidate()
  // })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  // const [image, setImage] = useState<File | null>(null);

  const navigate = useNavigate({from: thisPath})

  const [validationIssues, setValidationIssues] = useState <any>({})

  const validateFormFields = () => {
      const formData = {
      email, password, name,
      // callbackURL: '/auth/signin',
      // SJS image: image ? convertImageToBase64(image) : undefined,
      // image: undefined,
    }

    let isValid = true;

    try {
      const valibotResult = v.parse(
        SignupSchema,
        formData,
        {abortPipeEarly: true} // ensures each key, e.g. email, has only one error message
        )
      console.log('signup call to signUp.email()\n', {valibotResult})
    }
    catch (error: any) { /*: ValiError<typeof SignupSchema>*/
      console.log('validation exception error', {error})
      const flattenedIssues = v.flatten<typeof SignupSchema>(error.issues)
      console.log('validation exception error', {flattenedIssues: flattenedIssues.nested})
      setValidationIssues (flattenedIssues?.nested ?? {})
      console.log('validation exception error', {validationIssues})
      isValid = false
    }

    return isValid
  }

  const doSignUp = async () => {
    console.log('signup call to signUp.email()\n')
    const {
      // data,
      error
    } = await signUp.email(
      {
        email,
        password,
        name,
        callbackURL: '',
        // SJS image: image ? convertImageToBase64(image) : undefined,
        // image: undefined,
      },
      {
        onRequest: (ctx) => {
          console.log('signup.email - onRequest', {ctx})
        },
        onSuccess: (ctx) => {
          console.log('signup.email - onSuccess', {ctx})

          window.location.href = '/auth/signin'
        },
        onError: (ctx) => {
          // alert(ctx.error.message);
          console.log({ctxError: ctx.error.message, authClientError: error})
        },
      },
    )
  }

  const handleSignUp = (event: SyntheticEvent) => {
    // event.persist() // React-spacific - needed when used in async function
    // prevent default form submission behavior
    event.preventDefault();
    event.stopPropagation();

    const isValid = validateFormFields()

    if (isValid) doSignUp()
  }

  return (
    <main>
      <section>
        <form>
          <label>Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormFieldError message={validationIssues?.email}/>
          </label>
          <label>Name
            <input
              type="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FormFieldError message={validationIssues?.password}/>
          </label>
          <button onClick={handleSignUp}>Sign Up</button>
        </form>
      </section>
    </main>
  )
}

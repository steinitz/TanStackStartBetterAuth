import {noValue} from "~/constants";

// we expect either an error message or the noValue string - makes it easier to
// format consistently between the error and no error state

export const FormFieldError = ({message}: {message: string}) => {
  // console.log({message}, isError);
  const isError = message !== noValue
  return (
      <p
        style={{
          // These three evil, "magic" values allow constant vartical spacing
          // with or without this component (FormFieldError) below an input
          // field, given the current mvp-css values and my overrides
          // They also place the error very close, vetically, to the input field
          lineHeight: 0.0,
          marginTop: "-8px",
          marginBottom: "8px",

          fontSize: "0.8rem",
          color: 'var(--color-error)',
          // fontWeight: "normal",

          // Trick to show and hide the error without "layout jank/shift"
          opacity:  isError ? 1 : 0,
          // Prevent user selection of the hidden error.
          // note this also causes a non-ideal behavior
          // in Safari if the user selects the form contents
          userSelect: isError ? 'auto' : 'none',
        }}
      >
        {message}
      </p>
  )
}

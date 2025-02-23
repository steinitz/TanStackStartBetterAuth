export const fieldsFromFormData = (formData: FormData) => {
  return (
    // this version puts each values in an array to support, say, multiple "name" fields
    // const fields = Object.fromEntries([...formData.keys()].map(
    // key => [key, formData.getAll(key)]))

    // this simpler version apparently won't work with checkboxes or, of course, mutiples
    Object.fromEntries(formData.entries())
  )
}

export const sharedFormSubmission = (
  event: React.SyntheticEvent<HTMLFormElement>
): any => {
  // prevent default form submission behavior
  event.preventDefault();
  event.stopPropagation();
  // extract field values from form
  // maybe should return FormData too
  const formData = new FormData(event.currentTarget);
  const fields = fieldsFromFormData(formData)
  console.log('handleSetNewPassword', {fields})

  return fields;
}

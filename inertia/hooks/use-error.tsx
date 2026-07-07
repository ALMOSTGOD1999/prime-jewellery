import useFlash from '~/hooks/use-flash'

export default function useError() {
  const props = useFlash<{ errors: Record<string, any> }>()
  return props?.errors
}

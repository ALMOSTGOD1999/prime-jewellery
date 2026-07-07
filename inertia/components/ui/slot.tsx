import * as React from 'react'
import { cn } from '~/lib/utils'

function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref != null) {
        ;(ref as React.MutableRefObject<T | null>).current = node
      }
    })
  }
}

interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode
}

const Slot = React.forwardRef<HTMLElement, SlotProps>((props, ref) => {
  const { children, ...slotProps } = props

  if (!React.isValidElement(children)) {
    return null
  }

  return React.cloneElement(children, {
    ...mergeProps(slotProps, children.props),
    ref: ref ? composeRefs(ref, (children as any).ref) : (children as any).ref,
  } as any)
})

Slot.displayName = 'Slot'

function mergeProps(slotProps: any, childProps: any) {
  const overrideProps = { ...childProps }

  for (const propName in slotProps) {
    const slotPropValue = slotProps[propName]
    const childPropValue = childProps[propName]

    const isHandler = /^on[A-Z]/.test(propName)
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args: unknown[]) => {
          childPropValue(...args)
          slotPropValue(...args)
        }
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue
      }
    } else if (propName === 'style') {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue }
    } else if (propName === 'className') {
      overrideProps[propName] = cn(slotPropValue, childPropValue)
    }
  }

  return { ...slotProps, ...overrideProps }
}

export { Slot }

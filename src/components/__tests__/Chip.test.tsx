import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {Chip} from '../Chip';

/**
 * A chip label must never lose a word.
 *
 * "Đúng giờ" shipped for a while rendering as "Đúng": the chip was measured at
 * the full width — so the box was right — but Android laid the text out one
 * hair wider than that, broke it at the space, and clipped the second line out
 * of a 44pt box. Nothing about it looked like a layout bug; it read as a
 * missing translation, which is why it survived.
 */
describe('Chip', () => {
  const render = (label: string, selected = false) => {
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <Chip label={label} selected={selected} onPress={() => undefined} />,
      );
    });
    return tree!;
  };

  it('renders the whole label, spaces and all', () => {
    const tree = render('Đúng giờ', true);
    expect(JSON.stringify(tree.toJSON())).toContain('Đúng giờ');
    ReactTestRenderer.act(() => tree.unmount());
  });

  it('pins the label to one line', () => {
    // Without this, a measurement disagreement hides the tail instead of
    // showing an ellipsis — a silent failure rather than a visible one.
    const tree = render('Đúng giờ');
    const text = tree.root.findByProps({children: 'Đúng giờ'});
    expect(text.props.numberOfLines).toBe(1);
    ReactTestRenderer.act(() => tree.unmount());
  });

  it('uses the label as its accessibility name by default', () => {
    const tree = render('Đúng giờ');
    expect(
      tree.root.findByProps({accessibilityRole: 'button'}).props
        .accessibilityLabel,
    ).toBe('Đúng giờ');
    ReactTestRenderer.act(() => tree.unmount());
  });
});

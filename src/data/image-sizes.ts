// These lengths describe complete source canvases, before CSS overflow/crop.
const flow = (desktop: string, tablet: string, mobile?: string) =>
  (mobile ? `(max-width: 600px) ${mobile}, ` : '') +
  `(max-width: 1100px) ${tablet}, (max-height: 759px) ${tablet}, (pointer: coarse) ${tablet}, ${desktop}`;
export const imageSizes = {
  invitationLogo: flow('26.03vw', '280px', '239px'),
  about: flow('124.635vw', 'calc(124.635vw - 103.45px)', 'calc(249.27vw - 119.65px)'),
  architecture: flow('122.68vw', '122.59vw', 'max(100vw, 760px)'),
  map: flow('109.65vw', 'calc(109.65vw - 52.63px)', 'calc(240vw - 115.2px)'),
  layoutBack: flow('max(100vw, 177.78svh)', 'max(100vw, 889px)', 'max(100vw, 712px)'),
  layoutView: flow('max(100vw, 159.91svh)', 'max(100vw, 800px)', 'max(100vw, 640px)'),
  interiorEntry: flow('104.22vw', 'max(100vw, 800px)', 'max(100vw, 832px)'),
  skyline: flow('110.76vw', '110.76vw', 'max(160vw, 794px)'),
  contact: flow('130.43vw', 'max(calc(121.6vw - 58.37px), 1638px)', 'calc(326.64vw - 156.79px)'),
  contactLogo: flow('201px', '161px', '145px'),
  // Header, intro (1.25x), and mobile menu reuse the same logo file.
  logo: '270px',
  enquiry: 'min(420px, 26.875vw)',
};
export const wellbeingImageSizes: Record<string, string> = {
  Interaction: flow('28.472vw', 'calc(50vw - 37px)', 'calc(100vw - 48px)'),
  Balance: flow('30.7vw', 'calc(53.9vw - 39.9px)', 'calc(102.44vw - 49.17px)'),
};
export const collageImageSizes: Record<string, string> = {
  collage__marina: flow('28.472vw', '28.472vw', '44vw'),
  collage__golf: flow('79vw', '79vw', '116.53vw'),
  collage__living: flow('63.735vw', '63.735vw', '94.01vw'),
  collage__tower: flow('28.472vw', '28.472vw', '42vw'),
  collage__detail: flow('max(28.472vw, 86.33svh)', 'max(28.472vw, 648px)', 'max(42vw, 374px)'),
  collage__kitchen: flow('max(28.472vw, 68.992svh)', 'max(28.472vw, 518px)', 'max(42vw, 384px)'),
  collage__arrival: flow('41.4vw', '41.4vw', '1px'),
};

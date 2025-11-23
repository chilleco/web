import { useDispatch } from 'react-redux';

import { popupSet } from '../redux/actions/system';

export default ({ children }) => {
  const dispatch = useDispatch();
  // const main = useSelector(state => state.main);

  return (
    <div className="popup">
      <div
        className="popup_cover"
        onClick={() => dispatch(popupSet(null))}
      />
      <div className="popup_body">
        {children}
      </div>
    </div>
  );
};

import axios from "axios";
import { useSelector } from "react-redux";
// import { url } from "../slices/api";
import styled from "styled-components";

const Button = styled.button`
  width: 300px;
  padding: 10px;
  background-color: black;
  color: white;
  font-weight: 600;
  cursor: pointer;
  margin: 10px;
`;

const PayButton = ({ cartItems }) => {
  const user = useSelector((state) => state.user.currentUser);
  const url = "http://localhost:5000/api";

  const handleCheckout = () => {
    axios
      .post(`${url}/stripe/create-checkout-session`, {
        cartItems,
        userId: user._id,
      })
      .then((response) => {
        if (response.data.session.url) {
          window.location.href = response.data.session.url;
        }
      })
      .catch((err) => console.log(err.message));
  };

  return (
    <>
      {user ? (
        <Button onClick={() => handleCheckout()}>Check out</Button>
      ) : (
        <div>Please login to checkout</div>
      )}
    </>
  );
};

export default PayButton;
